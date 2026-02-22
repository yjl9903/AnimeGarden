import type {
  DownloaderProviderType,
  DownloadEvent,
  DownloadRequest,
  DownloadTicket,
  DownloaderTransferStats,
  TorrentDetail,
  TorrentState
} from './torrent.ts';

export abstract class Downloader {
  public abstract readonly provider: DownloaderProviderType;

  public abstract initialize(): Promise<void>;

  public abstract close(): Promise<void>;

  public abstract syncToDatabase(): Promise<void>;

  public abstract ensureQueued(requests: DownloadRequest[]): Promise<DownloadTicket[]>;

  public abstract runScheduler(hashes: string[]): Promise<string[]>;

  public abstract waitEvents(
    hashes: string[],
    progress?: (hash: string, state: TorrentState) => void
  ): AsyncGenerator<DownloadEvent>;

  public abstract getTransferStats(): Promise<DownloaderTransferStats>;

  public abstract getTorrentStates(hashes?: string[]): Promise<TorrentState[]>;

  public abstract getTorrentDetail(infoHash: string): Promise<TorrentDetail | undefined>;
}
