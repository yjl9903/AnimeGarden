import type { System } from '../system/index.ts';

import { Module } from '../system/module.ts';

import type { FeedOptions } from './types.ts';

import { FeedCache } from './cache.ts';
import { getRssString } from './rss/index.ts';
import { normalizeFeedOptions } from './search.ts';
import { generateTitleFromFilter } from './meta.ts';
import { convertResourceToRssItem } from './utils.ts';

export type { FeedOptions, FeedContent } from './types.ts';

// Keep the extension namespace stable across both feeds and configured site hosts.
const feedNamespaces = { animegarden: 'https://animes.garden/ns/rss/1.0' };

/** Owns RSS generation and the rendered resource-feed cache for one System. */
export class FeedModule extends Module<System['modules']> {
  public static name = 'feed';

  private readonly cache = new FeedCache();

  /** System refreshes resource queries before invalidating their rendered feed content. */
  public async refresh() {
    this.cache.clear();
  }

  /** Generate or reuse subscription content from parsed domain options. */
  public async getResourcesFeed(options: FeedOptions) {
    const { pagination, filter, tracker, search } = normalizeFeedOptions(options);
    const site = this.system.options.site ?? 'animes.garden';

    return this.cache.get(search, async () => {
      const resp = await this.system.modules.resources.query.find(filter, pagination);
      return getRssString({
        title: await generateTitleFromFilter(filter, this.system.modules.subjects),
        description: 'Anime Garden 是動漫花園資源網的第三方镜像站',
        site: `https://${site}/resources/1${search}`,
        trailingSlash: false,
        xmlns: feedNamespaces,
        items: resp.resources.map((resource) => convertResourceToRssItem(resource, tracker, site))
      });
    });
  }

  /** Render a saved collection, or return undefined when it does not exist. */
  public async getCollectionFeed(hash: string, tracker: boolean) {
    const collection = await this.system.modules.collections.getCollection(hash);
    if (!collection) return undefined;

    const site = this.system.options.site ?? 'animes.garden';

    return getRssString({
      title: collection.name || '收藏夹 ' + hash,
      description: 'Anime Garden 是動漫花園資源網的第三方镜像站.',
      site: `https://${site}/collection/${hash}`,
      trailingSlash: false,
      xmlns: feedNamespaces,
      items: collection.results.flatMap((result) =>
        result.resources.map((resource) => convertResourceToRssItem(resource, tracker, site))
      )
    });
  }
}
