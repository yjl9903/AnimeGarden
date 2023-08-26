import type { ResolvedFilterOptions, ResourceDetail } from 'animegarden';

import type { Env } from './types';

export async function updateRefreshTimestamp(env: Env) {
  const now = new Date();
  try {
    await env.animegarden.put('state/refresh-timestamp', now.toISOString());
  } finally {
    return now;
  }
}

export async function getRefreshTimestamp(env: Env) {
  return new Date((await env.animegarden.get('state/refresh-timestamp')) ?? 0);
}

export function getDetailStore(env: Env) {
  return new KVStore<ResourceDetail>(env.animegarden, 'detail');
}

export function getResourcesStore(env: Env) {
  return new KVStore<{
    filter: ResolvedFilterOptions;
    timestamp: Date;
    resources: {
      id: number;
      href: string;
      title: string;
      titleAlt: string;
      type: string;
      size: string;
      magnet: string;
      createdAt: Date;
      anitomy: unknown;
      fansubId: number | null;
      publisherId: number;
      publisherName: string | null;
      fansubName: string | null;
    }[];
  }>(env.animegarden, 'resources');
}

export class KVStore<V> {
  private readonly prefix: string;

  /**
   * By default, 1 hour
   */
  private readonly ttl: number = 60 * 60;

  constructor(
    private readonly store: KVNamespace,
    prefix = ''
  ) {
    this.prefix = prefix + ':';
  }

  async get(key: string): Promise<V | undefined> {
    try {
      const text = await this.store.get(this.prefix + key);
      if (!!text) {
        const result = JSON.parse(text) as { value: V };
        return result.value;
      } else {
        return undefined;
      }
    } catch (error) {
      console.error(error);
      return undefined;
    }
  }

  async keys(options?: Omit<KVNamespaceListOptions, 'prefix'>): Promise<string[]> {
    return (await this.store.list({ ...options, prefix: this.prefix })).keys.map((k) => k.name);
  }

  async has(key: string): Promise<boolean> {
    return !!(await this.store.get(this.prefix + key));
  }

  async put(key: string, value: V, options?: KVNamespacePutOptions): Promise<void> {
    try {
      await this.store.put(
        this.prefix + key,
        JSON.stringify({ value, timestamp: new Date().getTime() }),
        {
          expirationTtl: this.ttl,
          ...options
        }
      );
    } catch (error) {
      console.error(error);
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await this.store.delete(this.prefix + key);
    } catch (error) {
      console.error(error);
    }
  }
}
