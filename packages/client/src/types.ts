import type { ParseResult } from 'anipar';

interface Resource<T extends { tracker?: boolean; metadata?: boolean } = {}> {
  id: number;

  provider: string;

  providerId: string;

  title: string;

  href: string;

  type: string;

  magnet: string;

  tracker: T['tracker'] extends true
    ? string
    : T['tracker'] extends false
      ? null | undefined
      : string | null | undefined;

  size: number;

  fansub?: {
    id: number;

    name: string;

    avatar?: string;
  };

  publisher: {
    id: number;

    name: string;

    avatar?: string;
  };

  createdAt: Date;

  fetchedAt: Date;

  metadata?: T['metadata'] extends true
    ? { anipar?: ParseResult }
    : T['metadata'] extends false
      ? null | undefined
      : { anipar?: ParseResult } | null | undefined;
}

export interface ScrapedResource {
  provider: string;

  providerId: string;

  title: string;

  href: string;

  type: string;

  magnet: string;

  tracker: string;

  size: string;

  publisher?: {
    id: string;

    name: string;

    avatar?: string;
  };

  fansub?: {
    id: string;

    name: string;

    avatar?: string;
  };

  /**
   * Date.toISOString()
   */
  createdAt: string;
}

export interface ScrapedResourceDetail extends Omit<ScrapedResource, 'magnet' | 'tracker'> {
  description: string;

  files: Array<{
    name: string;

    size: string;
  }>;

  magnets: Array<{
    name: string;

    url: string;
  }>;

  hasMoreFiles: boolean;
}
