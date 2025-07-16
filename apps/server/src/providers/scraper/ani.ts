import type { ProviderType, ScrapedResource, ScrapedResourceDetail } from '@animegarden/client';

import { fetchLastestANi, fetchANiDetail } from '@animegarden/scraper';

import type { System } from '../../system';

import { Provider } from './base';

export class ANiProvider extends Provider {
  public static readonly name: ProviderType = 'ani';

  public get name() {
    return ANiProvider.name;
  }

  public async fetchLatestResources(sys: System): Promise<ScrapedResource[]> {
    const newRes = await fetchLastestANi(fetch, { retry: 5 });

    const existed = await sys.modules.resources
      .getResourcesByProviderId(
        ANiProvider.name,
        newRes.map((r) => r.providerId)
      )
      .catch(() => []);
    const set = new Set(existed.map((r) => r.providerId));

    const realNewRes = newRes.filter((r) => !set.has(r.providerId));
    return realNewRes;
  }

  public async fetchResourcePages(): Promise<ScrapedResource[]> {
    return await fetchLastestANi(fetch, { retry: 5 });
  }

  public async fetchResourceDetail(
    sys: System,
    id: string
  ): Promise<ScrapedResourceDetail | undefined> {
    try {
      const resp = await fetchANiDetail(fetch, id, { retry: 5 });
      if (resp) {
        return resp;
      }
    } catch (error) {
      sys.logger.error(error);
    }

    return undefined;
  }

  public async getDetailURL(_sys: System, id: string) {
    return {
      provider: ANiProvider.name,
      providerId: id,
      href: id
    };
  }
}
