import type { ResourceDetail } from 'animegarden';

import type { Env } from './types';

export async function updateRefreshTimestamp(env: Env) {
  await env.animegarden.put('state/refresh-timestamp', new Date().toISOString());
}

export async function getRefreshTimestamp(env: Env) {
  return new Date((await env.animegarden.get('state/refresh-timestamp')) ?? 0);
}

export function getDetailStore(env: Env) {
  return new KVStore<ResourceDetail>(env.animegarden, 'detail/');
}

export class KVStore<V> {
  private readonly prefix: string;

  constructor(private readonly store: KVNamespace, prefix = '') {
    this.prefix = prefix + ':';
  }

  async get(key: string): Promise<V | undefined> {
    const now = new Date();
    try {
      const text = await this.store.get(this.prefix + key);
      if (!!text) {
        const result = JSON.parse(text);
        const created = new Date(result.timestamp);
        if (now.getTime() - created.getTime() <= 1000 * 60 * 60 * 24 * 30) {
          return result.value;
        } else {
          await this.remove(key);
          return undefined;
        }
      } else {
        return undefined;
      }
    } catch (error) {
      console.error(error);
      return undefined;
    }
  }

  async keys(): Promise<string[]> {
    return (await this.store.list({ prefix: this.prefix })).keys.map((k) => k.name);
  }

  async has(key: string): Promise<boolean> {
    return !!(await this.store.get(this.prefix + key));
  }

  async put(key: string, value: V): Promise<void> {
    await this.store.put(
      this.prefix + key,
      JSON.stringify({ timestamp: new Date().toISOString(), value })
    );
  }

  async remove(key: string): Promise<void> {
    await this.store.delete(this.prefix + key);
  }
}
