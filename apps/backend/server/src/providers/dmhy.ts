import type { System } from '@animegarden/database';
import type { ScrapedResource, ScrapedResourceDetail } from '@animegarden/client';

import { fetchDmhyPage, fetchDmhyDetail } from '@animegarden/scraper';

import { Provider, fetchLatestPages } from './base';

export class DmhyProvider extends Provider {
  public static readonly name = 'dmhy';

  public async fetchLatestResources(sys: System): Promise<ScrapedResource[]> {
    return await fetchLatestPages(sys, DmhyProvider.name, (page) =>
      fetchDmhyPage(fetch, { page, retry: 5 })
    );
  }

  public async fetchResourceDetail(
    sys: System,
    id: string
  ): Promise<ScrapedResourceDetail | undefined> {
    return await fetchDmhyDetail(fetch, id);
  }
}
