import type { Resource, Team, User } from '@prisma/client/edge';
import type { ResourceDetail } from 'animegarden';

import type { Env } from './types';

export async function updateRefreshTimestamp(env: Env) {
  try {
    await env.animegarden.put('state/refresh-timestamp', new Date().toISOString());
  } catch {}
}

export async function getRefreshTimestamp(env: Env) {
  return new Date((await env.animegarden.get('state/refresh-timestamp')) ?? 0);
}

export function getDetailStore(env: Env) {
  return new KVStore<ResourceDetail>(env.animegarden, 'detail/');
}

export function getSearchStore(env: Env) {
  return new KVStore<
    (Resource & {
      fansub: Team | null;
      publisher: User;
    })[]
  >(env.animegarden, 'search');
}

export class KVStore<V> {
  private readonly prefix: string;

  private readonly ttl: number = 1000 * 60 * 60 * 24 * 30;

  constructor(private readonly store: KVNamespace, prefix = '') {
    this.prefix = prefix + ':';
  }

  async get(key: string): Promise<V | undefined> {
    try {
      const text = await this.store.get(this.prefix + key);
      if (!!text) {
        const result = JSON.parse(text);
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
      await this.store.put(this.prefix + key, JSON.stringify({ value }), {
        expirationTtl: this.ttl,
        ...options
      });
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
