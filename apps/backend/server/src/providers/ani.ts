import type { System } from '@animegarden/database';
import type { ProviderType, ScrapedResource, ScrapedResourceDetail } from '@animegarden/client';

import { fetchLastestANi, fetchANiDetail } from '@animegarden/scraper';

import { Provider } from './base';

export class ANiProvider extends Provider {
  public static readonly name: ProviderType = 'ani';

  public get name() {
    return ANiProvider.name;
  }

  public async fetchLatestResources(): Promise<ScrapedResource[]> {
    return await fetchLastestANi(fetch, { retry: 5 });
  }

  public async fetchResourcePages(): Promise<ScrapedResource[]> {
    return await fetchLastestANi(fetch, { retry: 5 });
  }

  public async fetchResourceDetail(
    _sys: System,
    id: string
  ): Promise<ScrapedResourceDetail | undefined> {
    return await fetchANiDetail(fetch, id, { retry: 5 });
  }

  public async getDetailURL(_sys: System, id: string) {
    return {
      provider: ANiProvider.name,
      providerId: id,
      href: id
    };
  }
}
