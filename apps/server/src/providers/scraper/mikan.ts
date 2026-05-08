import type { ProviderType, ScrapedResource, ScrapedResourceDetail } from '@animegarden/client';

import { fetchMikanDetail, fetchMikanPage } from '@animegarden/scraper';

import type { System } from '../../system/index.ts';

import { Provider, fetchLatestPages, fetchResourcePages } from './base.ts';

export class MikanProvider extends Provider {
  public static readonly name: ProviderType = 'mikan';

  public get name() {
    return MikanProvider.name;
  }

  public async fetchLatestResources(sys: System): Promise<ScrapedResource[]> {
    return await fetchLatestPages(sys, MikanProvider.name, async (page) =>
      (await fetchMikanPage(fetch, { page, retry: 5 })).filter((r) => r.fansub && r.publisher)
    );
  }

  public async fetchResourcePages(
    sys: System,
    start: number,
    end: number
  ): Promise<ScrapedResource[]> {
    return await fetchResourcePages(
      sys,
      MikanProvider.name,
      async (page) =>
        (await fetchMikanPage(fetch, { page, retry: 5 })).filter((r) => r.fansub && r.publisher),
      start,
      end
    );
  }

  public async fetchResourceDetail(
    _sys: System,
    id: string
  ): Promise<ScrapedResourceDetail | undefined> {
    return await fetchMikanDetail(fetch, id, { retry: 5 });
  }

  public async getDetailURL(_sys: System, id: string) {
    return {
      provider: MikanProvider.name,
      providerId: id,
      href: id
    };
  }
}
