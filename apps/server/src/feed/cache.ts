import { createHash } from 'node:crypto';
import { LRUCache } from 'lru-cache';

import type { FeedContent } from './types.ts';

/** Bounded content cache with coalesced generation and notification-aware publication. */
export class FeedCache {
  private readonly entries: LRUCache<string, FeedContent>;

  private readonly pending = new Map<string, Promise<FeedContent>>();

  private clearedAt = Date.now();

  public constructor(
    ttl = 60_000,
    maxBytes = 16 * 1024 * 1024,
    private readonly maxEntries = 128
  ) {
    this.entries = new LRUCache({
      max: maxEntries,
      maxSize: maxBytes,
      sizeCalculation: (entry) => Math.max(1, Buffer.byteLength(entry.xml)),
      ttl,
      ttlResolution: 0,
      // Keep expiration on the same clock as generatedAt and cache refreshes.
      perf: { now: () => Date.now() }
    });
  }

  /** Drop cached content and detach pending renders when the module receives a refresh. */
  public clear() {
    this.entries.clear();
    this.pending.clear();
    this.clearedAt = Date.now();
  }

  /** Return cached content or share a pending render for the same subscription. */
  public async get(key: string, render: () => Promise<string>): Promise<FeedContent> {
    let entry = this.entries.get(key);
    if (!entry) {
      let pending = this.pending.get(key);
      if (!pending) {
        const changedAt = this.clearedAt;
        pending = (async () => {
          const xml = await render();
          const generatedAt = Date.now();
          const result: FeedContent = {
            xml,
            digest: createHash('sha1').update(xml).digest('hex'),
            generatedAt,
            changedAt,
            // A clear detaches this promise even when another render uses the same key.
            stable: this.pending.get(key) === pending
          };
          if (result.stable) {
            this.entries.set(key, result);
          }
          return result;
        })();
        if (this.pending.size < this.maxEntries) this.pending.set(key, pending);
      }
      try {
        entry = await pending;
      } finally {
        // A detached request must not remove the replacement render's promise.
        if (this.pending.get(key) === pending) this.pending.delete(key);
      }
    }

    // A clear may run after rendering finishes but before the pending result resumes here.
    // This timestamp check cannot distinguish a clear in the same millisecond as initialization
    // or the previous clear. If it falls in that gap, the in-flight response may remain stable,
    // but clear() still removes the cached XML. Accept this narrow race for now rather than
    // adding a separate invalidation version counter.
    return {
      xml: entry.xml,
      digest: entry.digest,
      generatedAt: entry.generatedAt,
      changedAt: entry.changedAt,
      stable: entry.stable && entry.changedAt === this.clearedAt
    };
  }
}
