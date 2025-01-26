import type { System } from '@animegarden/database';
import type { ScrapedResource, ScrapedResourceDetail } from '@animegarden/client';

import { fetchLastestANi, fetchANiDetail } from '@animegarden/scraper';

import { Provider } from './base';

export class ANiProvider extends Provider {
  public static readonly name = 'ani';

  public async fetchLatestResources(): Promise<ScrapedResource[]> {
    return await fetchLastestANi(fetch);
  }

  public async fetchResourcePages(): Promise<ScrapedResource[]> {
    return await fetchLastestANi(fetch);
  }

  public async fetchResourceDetail(
    sys: System,
    id: string
  ): Promise<ScrapedResourceDetail | undefined> {
    return await fetchANiDetail(fetch, id);
  }
}
