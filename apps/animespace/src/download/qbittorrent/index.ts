import createDebug from 'debug';
import { lightRed } from 'breadc';
import { QBittorrent } from 'nqbt';
import { and, eq, inArray, sql } from 'drizzle-orm';

import type { System } from '../../system/system.ts';

import { md5File } from '../../utils/checksum.ts';
import { torrents } from '../../sqlite/torrent.ts';
import { memoAsync } from '../../utils/result.ts';

import {
  DownloaderConnectionStatus,
  DownloadEventStatus,
  DownloadTicketStatus,
  TorrentStatus,
  type DownloadEvent,
  type DownloadRequest,
  type DownloadTicket,
  type DownloaderTransferStats,
  type TorrentDetail,
  type TorrentState
} from '../torrent.ts';
import { Downloader } from '../downloader.ts';

import {
  DEFAULT_QBITTORRENT_SHARE_LIMITS,
  REQUEST_TIMEOUT_MS,
  POLL_INTERVAL_MS,
  DEFAULT_CATEGORY
} from './const.ts';

export class QbittorrentDownloader extends Downloader {
  public readonly provider = 'qbittorrent' as const;

  private readonly debug = createDebug('animespace:qbittorrent');

  private client?: QBittorrent;

  public constructor(private readonly system: System) {
    super();
  }

  private readonly runInitializing = memoAsync(async () => {
    const config = this.getConfig();

    const client = new QBittorrent({
      baseURL: config.url,
      username: config.username,
      password: config.password,
      timeout: REQUEST_TIMEOUT_MS
    });

    const ok = await client.login();
    if (!ok) {
      throw new Error('Failed to login qBittorrent WebUI.');
    }

    const categories = await client.getAllCategories();
    if (!categories[config.category]) {
      await client.addNewCategory(config.category, config.savePath);
    } else if (categories[config.category].savePath !== config.savePath) {
      await client.editCategory(config.category, config.savePath);
    }

    this.client = client;

    await this.syncCategoryStatesToDatabase();

    this.debug('initialized qbittorrent downloader');
  });

  public async initialize(): Promise<void> {
    await this.runInitializing();
  }

  public async close(): Promise<void> {
    this.runInitializing.clear();

    const client = this.client;
    this.client = undefined;
    if (!client) {
      return;
    }

    try {
      await client.logout();
    } catch (error) {
      this.debug('failed to logout qbittorrent', error);
    }
  }

  public async syncToDatabase(): Promise<void> {
    await this.initialize();
    await this.syncCategoryStatesToDatabase();
  }

  public async ensureQueued(requests: DownloadRequest[]): Promise<DownloadTicket[]> {
    await this.initialize();

    const config = this.getConfig();
    const client = this.getClient();

    const deduped = dedupeRequests(requests);
    if (deduped.length === 0) {
      return [];
    }

    this.debug(
      'ensureQueued',
      deduped.map((req) => req.infoHash)
    );

    const existed = await client.getTorrentList({
      hashes: deduped.map((req) => req.infoHash)
    });
    const existedMap = new Map(existed.map((torrent) => [torrent.hash, torrent]));

    const tickets: DownloadTicket[] = [];
    for (const req of deduped) {
      const prev = existedMap.get(req.infoHash);
      if (prev) {
        if (prev.category !== config.category) {
          await client.setTorrentCategory(req.infoHash, config.category);
        }
        tickets.push({
          infoHash: req.infoHash,
          status: DownloadTicketStatus.existing,
          subject: req.subject,
          resource: req.resource
        });
        continue;
      }

      try {
        await client.addNewMagnet(req.magnet, {
          category: config.category,
          savepath: config.savePath,
          paused: true
        });
      } catch (error) {
        this.system.logger.log(`${lightRed('下载失败')}  ${req.magnet}`);
        this.system.logger.error(error);
        tickets.push({
          infoHash: req.infoHash,
          status: DownloadTicketStatus.failed,
          subject: req.subject,
          resource: req.resource
        });
        continue;
      }

      try {
        await client.setTorrentShareLimits(req.infoHash, DEFAULT_QBITTORRENT_SHARE_LIMITS);
      } catch (error) {
        // Some qBittorrent versions may not apply immediately after add.
        this.debug('set torrent share limits failed', req.infoHash, error);
      }

      tickets.push({
        infoHash: req.infoHash,
        status: DownloadTicketStatus.created,
        subject: req.subject,
        resource: req.resource
      });
    }

    return tickets;
  }

  public async runScheduler(hashes: string[]): Promise<string[]> {
    await this.initialize();

    const client = this.getClient();
    const deduped = [...new Set(hashes.map((hash) => hash.trim()).filter(Boolean))];
    if (deduped.length === 0) {
      return [];
    }

    this.debug('runScheduler', hashes);

    const states = await this.getTorrentStates();
    await this.upsertStates(states);

    const byHash = new Map(states.map((state) => [state.infoHash, state]));
    const active = states.filter((s) => s.status === TorrentStatus.downloading);
    const { concurrency } = this.getConfig();

    if (active.length >= concurrency) {
      this.debug('active download count exceeds configured concurrency', active);
    }

    const toStart: string[] = [];
    const running: string[] = [];
    for (const hash of deduped) {
      const state = byHash.get(hash);
      if (!state) {
        continue;
      }

      if (state.status === TorrentStatus.pending) {
        if (toStart.length < concurrency - active.length) {
          running.push(hash);
          toStart.push(hash);
        }
      } else if (state.status === TorrentStatus.downloading) {
        running.push(hash);
      }
    }

    if (toStart.length > 0) {
      await client.startTorrents(toStart);
    }

    return running;
  }

  public async *waitEvents(
    hashes: string[],
    progress?: (hash: string, state: TorrentState) => void
  ): AsyncGenerator<DownloadEvent> {
    await this.initialize();

    const tracked = [...new Set(hashes.map((hash) => hash.trim()).filter(Boolean))];
    if (tracked.length === 0) {
      return;
    }

    const pending = new Set(tracked);
    while (pending.size > 0) {
      const snapshot = [...pending];
      const states = await this.getTorrentStates(snapshot);
      await this.upsertStates(states);
      const stateMap = new Map(states.map((state) => [state.infoHash, state]));

      const deleted: string[] = [];
      for (const hash of snapshot) {
        const state = stateMap.get(hash);

        if (!state) {
          pending.delete(hash);
          deleted.push(hash);

          yield {
            infoHash: hash,
            status: DownloadEventStatus.deleted,
            error: 'Torrent is missing.'
          };
          continue;
        }

        if (state.status === TorrentStatus.completed) {
          await this.upsertFiles(hash, true);

          pending.delete(hash);
          yield {
            infoHash: hash,
            status: DownloadEventStatus.completed
          };
          continue;
        }

        if (state.status === TorrentStatus.failed) {
          pending.delete(hash);

          yield {
            infoHash: hash,
            status: DownloadEventStatus.failed,
            error: 'Torrent entered failed state.'
          };
          continue;
        }

        if (progress) {
          try {
            progress(hash, state);
          } catch {}
        }
      }

      if (deleted.length > 0) {
        await this.deleteRows(deleted);
      }

      if (pending.size > 0) {
        await waitFor(POLL_INTERVAL_MS);
      }
    }
  }

  public async getTransferStats(): Promise<DownloaderTransferStats> {
    await this.initialize();

    const info = await this.getClient().getGlobalTransferInfo();
    return {
      downloadSpeed: info.dl_info_speed,
      uploadSpeed: info.up_info_speed,
      downloaded: info.dl_info_data,
      uploaded: info.up_info_data,
      connectionStatus: mapQbittorrentConnectionStatus(info.connection_status)
    };
  }

  public async getTorrentStates(hashes?: string[]): Promise<TorrentState[]> {
    const dedupedHashes = hashes
      ? [...new Set(hashes.map((hash) => hash.trim()).filter(Boolean))]
      : undefined;
    if (dedupedHashes && dedupedHashes.length === 0) {
      return [];
    }

    const config = this.getConfig();
    const torrents = await this.getClient().getTorrentList({
      category: config.category,
      hashes: dedupedHashes
    });

    return torrents.map((torrent) => ({
      infoHash: torrent.hash,
      name: torrent.name,
      status: mapQbittorrentStatus(torrent.state),
      progress: torrent.progress,
      downloadSpeed: torrent.dlspeed,
      uploadSpeed: torrent.upspeed,
      peerCount: torrent.num_seeds + torrent.num_leechs,
      seedCount: torrent.num_seeds,
      leechCount: torrent.num_leechs,
      size: torrent.size,
      eta: torrent.eta,
      downloaded: torrent.downloaded,
      uploaded: torrent.uploaded
    }));
  }

  public async getTorrentDetail(infoHash: string): Promise<TorrentDetail | undefined> {
    await this.initialize();

    const hash = infoHash.trim();
    if (!hash) {
      return undefined;
    }

    const [torrent] = await this.getClient().getTorrentList({
      hashes: [hash]
    });
    if (!torrent) {
      return undefined;
    }

    const files = await this.upsertFiles(infoHash);

    return {
      infoHash: torrent.hash,
      name: torrent.name,
      status: mapQbittorrentStatus(torrent.state),
      progress: torrent.progress,
      downloadSpeed: torrent.dlspeed,
      uploadSpeed: torrent.upspeed,
      peerCount: torrent.num_seeds + torrent.num_leechs,
      seedCount: torrent.num_seeds,
      leechCount: torrent.num_leechs,
      swarmSeedCount: torrent.num_complete,
      swarmLeechCount: torrent.num_incomplete,
      size: torrent.size,
      totalSize: torrent.total_size,
      amountLeft: torrent.amount_left,
      eta: torrent.eta,
      downloaded: torrent.downloaded,
      uploaded: torrent.uploaded,
      savePath: torrent.save_path,
      contentPath: torrent.content_path,
      addedOn: torrent.added_on,
      completionOn: torrent.completion_on,
      lastActivity: torrent.last_activity,
      files: files ?? []
    };
  }

  private async syncCategoryStatesToDatabase() {
    const states = await this.getTorrentStates();
    await this.upsertStates(states);
    await this.cleanupRows(states.map((state) => state.infoHash));
  }

  private async upsertStates(states: TorrentState[]) {
    if (states.length === 0) {
      return;
    }

    const now = new Date();
    const database = await this.system.openDatabase();
    await database
      .insert(torrents)
      .values(
        states.map((state) => ({
          infoHash: state.infoHash,
          downloader: this.provider,
          status: state.status,
          createdAt: now,
          updatedAt: now
        }))
      )
      .onConflictDoUpdate({
        target: torrents.infoHash,
        set: {
          downloader: this.provider,
          status: sql`excluded.status`,
          updatedAt: now
        }
      })
      .execute();
  }

  private async upsertFiles(hash: string, force = false) {
    const database = await this.system.openDatabase();
    const resp = await database.select().from(torrents).where(eq(torrents.infoHash, hash));
    if (!force && resp[0]?.files) return resp[0]?.files;

    try {
      const [torrent] = await this.getClient().getTorrentList({
        hashes: [hash]
      });
      if (torrent) {
        const files = await this.getClient().getTorrentContents(hash);
        const now = new Date();
        const toFiles = await Promise.all(
          files.map(async (file) => {
            const checksum = await md5File(torrent.save_path, file.name);
            const checksum2 = await md5File(torrent.save_path, file.name);
            if (checksum !== checksum2) {
              throw new Error(`checksum mismatch`);
            }

            return {
              name: file.name,
              size: file.size,
              checksum: checksum
            };
          })
        );
        await database
          .update(torrents)
          .set({ files: toFiles, updatedAt: now })
          .where(eq(torrents.infoHash, hash));
        return toFiles;
      }
    } catch (error) {
      this.system.logger.error(error);
    }
  }

  private async cleanupRows(activeHashes: string[]) {
    const database = await this.system.openDatabase();
    const localRows = await database
      .select({ infoHash: torrents.infoHash })
      .from(torrents)
      .where(eq(torrents.downloader, this.provider))
      .execute();

    const active = new Set(activeHashes);
    const stale = localRows.map((row) => row.infoHash).filter((infoHash) => !active.has(infoHash));
    if (stale.length === 0) {
      return;
    }

    await this.deleteRows(stale);
  }

  private async deleteRows(hashes: string[]) {
    const deduped = [...new Set(hashes.map((hash) => hash.trim()).filter(Boolean))];
    if (deduped.length === 0) {
      return;
    }

    const database = await this.system.openDatabase();
    await database
      .delete(torrents)
      .where(and(eq(torrents.downloader, this.provider), inArray(torrents.infoHash, deduped)))
      .execute();
  }

  private getConfig() {
    const config = this.system.space.downloader.qbittorrent;
    const url = config.url?.trim();
    if (!url) {
      throw new Error(
        'qBittorrent downloader requires `downloader.url` or `downloader.qbittorrent.url`.'
      );
    }

    return {
      ...config,
      url,
      category: config.category || DEFAULT_CATEGORY
    };
  }

  private getClient() {
    if (!this.client) {
      throw new Error('qBittorrent downloader is not initialized.');
    }
    return this.client;
  }
}

function dedupeRequests(requests: DownloadRequest[]) {
  const map = new Map<string, DownloadRequest>();
  for (const request of requests) {
    map.set(request.infoHash, request);
  }
  return [...map.values()];
}

function mapQbittorrentStatus(status: string): TorrentStatus {
  const text = status.toLowerCase();
  if (text.includes('error') || text.includes('missing')) {
    return TorrentStatus.failed;
  }
  if (
    text.includes('upload') ||
    text.includes('stalledup') ||
    text.includes('pausedup') ||
    text.includes('stoppedup') ||
    text.includes('checkingup') ||
    text.includes('forcedup')
  ) {
    return TorrentStatus.completed;
  }
  if (text.includes('downloading') || text.includes('forceddl') || text.includes('stalleddl')) {
    return TorrentStatus.downloading;
  }
  return TorrentStatus.pending;
}

function mapQbittorrentConnectionStatus(status: string): DownloaderConnectionStatus | undefined {
  const text = status.toLowerCase();
  switch (text) {
    case DownloaderConnectionStatus.connected:
      return DownloaderConnectionStatus.connected;
    case DownloaderConnectionStatus.firewalled:
      return DownloaderConnectionStatus.firewalled;
    case DownloaderConnectionStatus.disconnected:
      return DownloaderConnectionStatus.disconnected;
    default:
      return undefined;
  }
}

function waitFor(delayMs: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, delayMs));
}
