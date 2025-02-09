import type { System } from '@animegarden/database';
import type { ProviderType, ScrapedResource, ScrapedResourceDetail } from '@animegarden/client';

import { fetchDmhyPage, fetchDmhyDetail } from '@animegarden/scraper';

import { Provider, fetchLatestPages, fetchResourcePages } from './base';

export class DmhyProvider extends Provider {
  public static readonly name: ProviderType = 'dmhy';

  public get name() {
    return DmhyProvider.name;
  }

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
    href: string
  ): Promise<ScrapedResourceDetail | undefined> {
    return await fetchDmhyDetail(fetch, href);
  }

  public async getDetailURL(sys: System, id: string) {
    const match = /^(\d+)/.exec(id);
    if (!match) return undefined;
    const providerId = match[1];
    if (id === providerId) {
      const href = await sys.database.query.resources
        .findFirst({
          columns: {
            href: true
          },
          where: (resources, { and, eq }) =>
            and(eq(resources.provider, this.name), eq(resources.providerId, id))
        })
        .catch(() => undefined);

      if (href) {
        return {
          provider: this.name,
          providerId,
          href: href.href
        };
      }

      return undefined;
    } else {
      return {
        provider: this.name,
        providerId,
        href: id
      };
    }
  }
}
