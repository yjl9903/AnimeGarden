import { type WidgetHandle, lightGreen, lightRed, link } from 'breadc';

import type { System } from '../system/system.ts';
import type { Subject } from '../subject/subject.ts';

import { formatBytes } from '../utils/bytes.ts';

import type { Downloader } from './downloader.ts';

import {
  type DownloadEvent,
  type DownloadRequest,
  type DownloadTicket,
  type TorrentDetail,
  type DownloaderTransferStats,
  type TorrentState,
  DownloadEventStatus
} from './torrent.ts';
import { QbittorrentDownloader } from './qbittorrent/index.ts';

function createDownloader(system: System): Downloader {
  switch (system.space.downloader.provider) {
    case 'qbittorrent':
      return new QbittorrentDownloader(system);
  }
}

export class DownloaderManager {
  private readonly downloader: Downloader;

  private readonly runningTickets = new Map<string, DownloadTicket>();

  private readonly runningProgress = new Map<
    string,
    WidgetHandle<{
      message: string;
      value: number;
      total: number;
      speed?: number;
      eta?: number;
      peer?: number;
      progress?: number;
    }>
  >();

  public constructor(private readonly system: System) {
    this.downloader = createDownloader(system);
  }

  public get provider() {
    return this.downloader.provider;
  }

  public async initialize() {
    await this.downloader.initialize();
  }

  public async close() {
    this.runningTickets.clear();
    await this.downloader.close();
  }

  public async syncToDatabase() {
    await this.downloader.syncToDatabase();
  }

  public async submit(requests: DownloadRequest[]) {
    const tickets = await this.downloader.ensureQueued(requests);
    for (const ticket of tickets) {
      this.runningTickets.set(ticket.infoHash, ticket);
    }

    const running = this.getRunningHashes();
    if (running.length > 0) {
      await this.runScheduler(running);
    }

    return tickets;
  }

  public getRunningTickets() {
    return [...this.runningTickets.values()];
  }

  public getRunningHashes() {
    return [...this.runningTickets.keys()];
  }

  public async getTransferStats(): Promise<DownloaderTransferStats> {
    return await this.downloader.getTransferStats();
  }

  public async getTorrentStates(): Promise<TorrentState[]> {
    const targets = this.getRunningHashes();
    if (targets.length === 0) {
      return [];
    }
    return await this.downloader.getTorrentStates(targets);
  }

  public async getTorrentDetail(infoHash: string): Promise<TorrentDetail | undefined> {
    return await this.downloader.getTorrentDetail(infoHash);
  }

  public async *waitForSubject(subject: Subject): AsyncGenerator<DownloadEvent> {
    const targets = this.getRunningTickets()
      .filter((ticket) => ticket.subject.name === subject.name)
      .map((ticket) => ticket.infoHash);

    if (targets.length === 0) {
      return;
    }

    for await (const event of this.downloader.waitEvents(targets, this.updateProgress)) {
      const ticket = this.runningTickets.get(event.infoHash)!;

      this.runningTickets.delete(event.infoHash);
      this.runningProgress.get(event.infoHash)?.remove();
      this.runningProgress.delete(event.infoHash);

      if (event.status === DownloadEventStatus.completed) {
        this.system.logger.log(
          lightGreen(`成功下载  ${link(ticket.resource.extracted.filename, ticket.resource.url)}`)
        );
      } else if (
        event.status === DownloadEventStatus.failed ||
        event.status === DownloadEventStatus.deleted
      ) {
        this.system.logger.log(
          lightRed(`下载失败  ${link(ticket.resource.extracted.filename, ticket.resource.url)}`)
        );
      }

      {
        const selfRunning = this.getRunningTickets()
          .filter((ticket) => ticket.subject.name === subject.name)
          .map((ticket) => ticket.infoHash);

        if (selfRunning.length > 0) {
          await this.runScheduler(selfRunning);
        }
      }
      {
        const otherRunning = this.getRunningTickets()
          .filter((ticket) => ticket.subject.name !== subject.name)
          .map((ticket) => ticket.infoHash);
        if (otherRunning.length > 0) {
          await this.runScheduler(otherRunning);
        }
      }

      // Callback
      yield event;
    }
  }

  private async runScheduler(hashes: string[]) {
    for (const hash of await this.downloader.runScheduler(hashes)) {
      const ticket = this.runningTickets.get(hash)!;

      if (this.runningProgress.has(hash)) continue;

      const handle = this.system.logger.progress<{
        message: string;
        value: number;
        total: number;
        speed?: number;
        eta?: number;
        peer?: number;
        progress?: number;
      }>(`下载 ${ticket.resource.extracted.filename || ticket.resource.name}`, {
        width: 40,
        template: ['', '{message}', '{bar}{progress}{speed}{eta}{peer}'],
        fields: {
          progress(ctx) {
            if (ctx.state.progress) {
              return ' ' + (100 * ctx.state.progress).toFixed(1) + '%';
            }
            return ' 0%';
          },
          speed(ctx) {
            if (ctx.state.speed) {
              return ` | speed: ${formatBytes(ctx.state.speed)}/s`;
            }
            return '';
          },
          eta(ctx) {
            if (ctx.state.eta) {
              if (ctx.state.eta < 60) {
                return ` | eta: ${ctx.state.eta} s`;
              } else if (ctx.state.eta < 60 * 60) {
                return ` | eta: ${Math.floor(ctx.state.eta / 60)} min ${ctx.state.eta % 60 > 0 ? (ctx.state.eta % 60) + ' s' : ''}`;
              } else {
                const hour = Math.floor(ctx.state.eta / 60 / 60);
                const minute = Math.floor((ctx.state.eta % (60 * 60)) / 60);
                return ` | eta: ${hour} hour ${minute > 0 ? minute + ' min' : ''}`;
              }
            }
            return '';
          },
          peer(ctx) {
            if (ctx.state.peer) {
              return ` | peer: ${ctx.state.peer}`;
            }
            return '';
          }
        }
      });
      this.runningProgress.set(hash, handle);
    }
  }

  private updateProgress = (hash: string, state: TorrentState) => {
    const progress = this.runningProgress.get(hash);
    if (!progress) return;
    progress.setState({
      value: state.downloaded,
      total: state.size,
      speed: state.downloadSpeed,
      eta: state.eta,
      peer: state.peerCount,
      progress: state.progress
    });
  };
}
