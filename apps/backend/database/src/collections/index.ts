import { eq } from 'drizzle-orm';
import { memoAsync } from 'memofunc';

import type { System } from '../system';

import { type Collection, type CollectionFilter, hashCollection } from '@animegarden/client';

import { Module } from '../system/module';
import { retryFn } from '../utils';
import { collections } from '../schema/collections';

export class CollectionsModule extends Module<System['modules']> {
  public static name = 'collections';

  public async initialize() {
    await this.getCollection.clear();
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
          hash: collections.hash
        });

      if (resp.length === 1) {
        return resp[0];
      } else {
        return (
          await retryFn(
            () =>
              this.database
                .select({ id: collections.id, hash: collections.hash })
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

  public getCollection = memoAsync(async (hsh: string) => {
    const resp = await retryFn(
      () => this.database.select().from(collections).where(eq(collections.hash, hsh)),
      5
    );

    if (resp && resp.length === 1) {
      const collection = resp[0];
      const results = await Promise.all(
        collection.filters.map((f) =>
          this.system.modules.resources.query.find({ ...f, page: 1, pageSize: 100 })
        )
      );

      return {
        ...collection,
        results
      };
    }
  });
}
