import type { System } from '@animegarden/database';
import type { ScrapedResource, ScrapedResourceDetail } from '@animegarden/client';

import { fetchDmhyPage, fetchDmhyDetail } from '@animegarden/scraper';

import { Provider, fetchLatestPages, fetchResourcePages } from './base';

export class DmhyProvider extends Provider {
  public static readonly name = 'dmhy';

  public async fetchLatestResources(sys: System): Promise<ScrapedResource[]> {
    return await fetchLatestPages(sys, DmhyProvider.name, (page) =>
      fetchDmhyPage(fetch, { page, retry: 5 })
    );
  }

  public async fetchResourcePages(
    sys: System,
    start: number,
    end: number
  ): Promise<ScrapedResource[]> {
    return await fetchResourcePages(
      sys,
      DmhyProvider.name,
      (page) => fetchDmhyPage(fetch, { page, retry: 5 }),
      start,
      end
    );
  }

  public async fetchResourceDetail(
    _sys: System,
    id: string
  ): Promise<ScrapedResourceDetail | undefined> {
    return await fetchDmhyDetail(fetch, id);
  }
}
