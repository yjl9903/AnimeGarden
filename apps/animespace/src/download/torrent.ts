import type { Subject } from '../subject/subject.ts';
import type { ExtractedSubjectResource } from '../subject/source/resource.ts';

export type DownloaderProviderType = 'qbittorrent' | 'aria2';

export const enum TorrentStatus {
  pending = 'pending',
  downloading = 'downloading',
  completed = 'completed',
  failed = 'failed'
}

export const enum DownloadTicketStatus {
  existing = 'existing',
  created = 'created'
}

export const enum DownloadEventStatus {
  completed = 'completed',
  failed = 'failed',
  deleted = 'deleted'
}

export const enum DownloaderConnectionStatus {
  connected = 'connected',
  firewalled = 'firewalled',
  disconnected = 'disconnected'
}

export interface DownloadRequest {
  readonly infoHash: string;
  readonly magnet: string;
  readonly subject: Subject;
  readonly resource: ExtractedSubjectResource;
}

export interface DownloadTicket {
  readonly infoHash: string;
  readonly status: DownloadTicketStatus;
  readonly subject: Subject;
  readonly resource: ExtractedSubjectResource;
}

export interface DownloadEvent {
  readonly infoHash: string;
  readonly status: DownloadEventStatus;
  readonly error?: string;
}

export interface DownloaderTransferStats {
  readonly downloadSpeed: number;
  readonly uploadSpeed: number;
  readonly downloaded: number;
  readonly uploaded: number;
  readonly connectionStatus?: DownloaderConnectionStatus;
}

export interface TorrentState {
  readonly infoHash: string;
  readonly name: string;
  readonly status: TorrentStatus;
  readonly progress: number;
  readonly downloadSpeed: number;
  readonly uploadSpeed: number;
  readonly peerCount: number;
  readonly seedCount: number;
  readonly leechCount: number;
  readonly size: number;
  readonly eta: number;
  readonly downloaded: number;
  readonly uploaded: number;
}

export interface TorrentFile {
  name: string;

  size: number;

  checksum?: string;
}

export interface TorrentDetail {
  readonly infoHash: string;

  readonly name: string;

  readonly status: TorrentStatus;

  readonly progress: number;

  readonly downloadSpeed: number;

  readonly uploadSpeed: number;

  readonly peerCount: number;

  readonly seedCount: number;

  readonly leechCount: number;

  readonly swarmSeedCount: number;

  readonly swarmLeechCount: number;

  readonly size: number;

  readonly totalSize: number;

  readonly amountLeft: number;

  readonly eta: number;

  readonly downloaded: number;

  readonly uploaded: number;

  readonly savePath: string;

  readonly contentPath: string;

  readonly addedOn: number;

  readonly completionOn: number;

  readonly lastActivity: number;

  readonly files: TorrentFile[];
}
