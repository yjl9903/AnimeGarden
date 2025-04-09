import type { System } from '@animegarden/database';
import type { ProviderType, ScrapedResource, ScrapedResourceDetail } from '@animegarden/client';

import { fetchMoeDetail, fetchMoePage } from '@animegarden/scraper';

import { Provider, fetchLatestPages, fetchResourcePages } from './base';

export class MoeProvider extends Provider {
  public static readonly name: ProviderType = 'moe';

  public get name() {
    return MoeProvider.name;
  }

  public async fetchLatestResources(sys: System): Promise<ScrapedResource[]> {
    return await fetchLatestPages(sys, MoeProvider.name, (page) =>
      fetchMoePage(fetch, { page, retry: 5 })
    );
  }

  public async fetchResourcePages(
    sys: System,
    start: number,
    end: number
  ): Promise<ScrapedResource[]> {
    return await fetchResourcePages(
      sys,
      MoeProvider.name,
      (page) => fetchMoePage(fetch, { page, retry: 5 }),
      start,
      end
    );
  }

  public async fetchResourceDetail(
    _sys: System,
    id: string
  ): Promise<ScrapedResourceDetail | undefined> {
    return await fetchMoeDetail(fetch, id, { retry: 5 });
  }

  public async getDetailURL(_sys: System, id: string) {
    return {
      provider: MoeProvider.name,
      providerId: id,
      href: id
    };
  }
}
