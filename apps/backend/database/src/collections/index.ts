import { eq } from 'drizzle-orm';

import type { System } from '../system';

import { type Collection, hashCollection } from '@animegarden/client';

import { memo } from '../system/cache';
import { Module } from '../system/module';
import { retryFn } from '../utils';
import { collections } from '../schema/collections';

export class CollectionsModule extends Module<System['modules']> {
  public static name = 'collections';

  public async initialize() {
    await this.cleanup();
  }

  public async refresh() {
    await this.cleanup();
  }

  public async cleanup() {
    this.getCollection.clear();
  }

  public async generateCollection(collection: Collection<true>) {
    const hsh = hashCollection(collection);

    try {
      const resp = await this.database
        .insert(collections)
        .values({
          hash: hsh,
          authorization: collection.authorization,
          name: collection.name,
          filters: collection.filters
        })
        .onConflictDoNothing()
        .returning({
          id: collections.id,
          hash: collections.hash,
          createdAt: collections.createdAt
        });

      if (resp.length === 1) {
        this.logger.info(`Generate a new collection ${resp[0].hash}`);

        // async prefetch collection
        this.getCollection(resp[0].hash);

        return resp[0];
      } else {
        return (
          await retryFn(
            () =>
              this.database
                .select({
                  id: collections.id,
                  hash: collections.hash,
                  createdAt: collections.createdAt
                })
                .from(collections)
                .where(eq(collections.hash, hsh)),
            5
          ).catch(() => [])
        )?.[0];
      }
    } catch (error) {
      this.logger.error(error);
      return undefined;
    }
  }

  public getCollection = memo(
    async (hsh: string) => {
      const resp = await retryFn(
        () => this.database.select().from(collections).where(eq(collections.hash, hsh)),
        5
      );

      this.logger.info(`Get collection detail ${hsh} => ${resp?.length === 1 ? 'ok' : 'fail'}`);

      if (resp && resp.length === 1) {
        const collection = resp[0];
        const filters = collection.filters.map((item) => {
          const copy = {
            ...item
          };
          for (const [key, value] of Object.entries(copy)) {
            if (Array.isArray(value) && value.length === 0) {
              // @ts-ignore
              delete copy[key];
            }
          }
          // @hack Date type
          if (item.before) {
            copy.before = new Date(item.before);
          }
          if (item.after) {
            copy.after = new Date(item.after);
          }
          return copy;
        });

        const updatedAt = new Date();

        const results = await Promise.all(
          filters.map((f) =>
            this.system.modules.resources.query.find({ ...f, page: 1, pageSize: 1000 })
          )
        );

        return {
          hash: collection.hash,
          name: collection.name,
          createdAt: collection.createdAt,
          updatedAt,
          filters: collection.filters,
          results
        };
      }
    },
    { getKey: (hsh) => hsh, expirationTtl: 300 * 1000, maxSize: 1000 }
  );
}
