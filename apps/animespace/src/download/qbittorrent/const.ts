export interface QbittorrentShareLimits {
  readonly ratioLimit: number;

  readonly seedingTimeLimit: number;

  readonly inactiveSeedingTimeLimit: number;
}

// Per-torrent share limits applied when AnimeSpace creates a new qBittorrent task.
export const DEFAULT_QBITTORRENT_SHARE_LIMITS: Readonly<QbittorrentShareLimits> = Object.freeze({
  ratioLimit: 1,
  seedingTimeLimit: 60,
  inactiveSeedingTimeLimit: 15
});

export const REQUEST_TIMEOUT_MS = 10_000;

export const POLL_INTERVAL_MS = 3_000;

export const DEFAULT_CATEGORY = 'animespace';
