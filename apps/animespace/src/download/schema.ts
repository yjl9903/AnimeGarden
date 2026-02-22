import path from 'node:path';

import { z } from 'zod';

import type { LocalPath } from '../utils/fs.ts';

export const DownloaderProviderSchema = z.enum(['qbittorrent']);

export type DownloaderProvider = z.infer<typeof DownloaderProviderSchema>;

const QbittorrentDownloaderInputSchema = z
  .object({
    url: z.string().trim().min(1).optional(),
    username: z.string().trim().min(1).optional(),
    password: z.string().optional(),
    category: z.string().trim().min(1).optional(),
    concurrency: z.coerce.number().int().positive().optional(),
    savePath: z.string().trim().min(1).optional()
  })
  .passthrough();

type QbittorrentDownloaderInput = z.infer<typeof QbittorrentDownloaderInputSchema>;

export const DownloaderInputSchema = z
  .object({
    provider: DownloaderProviderSchema.default('qbittorrent'),

    // Flat input style
    url: z.string().trim().min(1).optional(),
    username: z.string().trim().min(1).optional(),
    password: z.string().optional(),
    category: z.string().trim().min(1).optional(),
    concurrency: z.coerce.number().int().positive().optional(),
    savePath: z.string().trim().min(1).optional(),

    // Normalized provider map style (for compatibility)
    qbittorrent: QbittorrentDownloaderInputSchema.optional()
  })
  .passthrough();

export interface QbittorrentDownloaderConfig {
  readonly url?: string;
  readonly username?: string;
  readonly password?: string;
  readonly category: string;
  readonly concurrency: number;
  readonly savePath: string;
}

export interface DownloaderConfig {
  readonly provider: DownloaderProvider;
  readonly qbittorrent: QbittorrentDownloaderConfig;
}

const DEFAULT_CATEGORY = 'animespace';
const DEFAULT_CONCURRENCY = 3;
const DEFAULT_SAVE_PATH = 'download/';

export function resolveDownloader(root: LocalPath, input?: unknown): DownloaderConfig {
  const parsed = DownloaderInputSchema.parse(input ?? {});
  if (parsed.provider !== 'qbittorrent') {
    throw new Error(`Unsupported downloader provider "${parsed.provider}".`);
  }

  const qbittorrentInput = mergeQbittorrentInput(parsed);

  return {
    provider: 'qbittorrent',
    qbittorrent: {
      url: qbittorrentInput.url,
      username: qbittorrentInput.username,
      password: qbittorrentInput.password,
      category: qbittorrentInput.category ?? DEFAULT_CATEGORY,
      concurrency: qbittorrentInput.concurrency ?? DEFAULT_CONCURRENCY,
      savePath: resolveDownloaderSavePath(root, qbittorrentInput.savePath)
    }
  };
}

function mergeQbittorrentInput(
  input: z.infer<typeof DownloaderInputSchema>
): QbittorrentDownloaderInput {
  const nested = input.qbittorrent;
  return {
    url: nested?.url ?? input.url,
    username: nested?.username ?? input.username,
    password: nested?.password ?? input.password,
    category: nested?.category ?? input.category,
    concurrency: nested?.concurrency ?? input.concurrency,
    savePath: nested?.savePath ?? input.savePath
  };
}

function resolveDownloaderSavePath(root: LocalPath, value: string | undefined) {
  const raw = (value ?? DEFAULT_SAVE_PATH).trim();
  const portable = raw.replace(/\\/g, '/');

  if (path.isAbsolute(raw) || path.posix.isAbsolute(portable) || path.win32.isAbsolute(raw)) {
    throw new Error(`downloader.savePath "${value}" must be relative to animespace root.`);
  }

  const segments = portable.split('/');
  if (segments.includes('..')) {
    throw new Error(`downloader.savePath "${value}" cannot contain "..".`);
  }

  const normalized = path.posix.normalize(portable);
  if (normalized === '.' || normalized.length === 0) {
    throw new Error(`downloader.savePath "${value}" is invalid.`);
  }

  return path.resolve(root.path, normalized);
}
