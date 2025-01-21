import type { System } from '@animegarden/database';
import type { ScrapedResource, ScrapedResourceDetail } from '@animegarden/client';

import { fetchMoeDetail, fetchMoePage } from '@animegarden/scraper';

import { Provider, fetchLatestPages } from './base';

export class MoeProvider extends Provider {
  public static readonly name = 'moe';

  public async fetchLatestResources(sys: System): Promise<ScrapedResource[]> {
    return await fetchLatestPages(sys, MoeProvider.name, (page) =>
      fetchMoePage(fetch, { page, retry: 5 })
    );
  }

  public async fetchResourceDetail(
    sys: System,
    id: string
  ): Promise<ScrapedResourceDetail | undefined> {
    return await fetchMoeDetail(fetch, id);
  }
}
