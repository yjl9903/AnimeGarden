import { z } from 'zod';

export interface Downloader {
  provider: 'qbittorrent';
}

export const DownloaderSchema = z.object({
  provider: z.enum(['qbittorrent'])
});
