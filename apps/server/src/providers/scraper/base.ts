import type { ProviderType, ScrapedResource, ScrapedResourceDetail } from '@animegarden/client';

import type { System } from '../../system';

export abstract class Provider {
  public static readonly name: string;

  public abstract get name(): ProviderType;

  public abstract fetchLatestResources(sys: System): Promise<ScrapedResource[]>;

  public abstract fetchResourcePages(
    sys: System,
    start: number,
    end: number
  ): Promise<ScrapedResource[]>;

  public abstract fetchResourceDetail(
    sys: System,
    id: string
  ): Promise<ScrapedResourceDetail | undefined>;

  public abstract getDetailURL(
    sys: System,
    id: string
  ): Promise<
    | {
        provider: ProviderType;
        providerId: string;
        href: string;
      }
    | undefined
  >;
}

export async function fetchLatestPages(
  sys: System,
  provider: string,
  fetch: (page: number) => Promise<ScrapedResource[]>
): Promise<ScrapedResource[]> {
  const visited = new Map<string, ScrapedResource>();

  for (let page = 1; ; page++) {
    sys.logger.info(`Start fetching ${provider} resources at page ${page}`);

    const resp = await fetch(page);
    const newRes = resp.filter((r) => !visited.has(r.providerId));

    const existed = await sys.modules.resources.getResourcesByProviderId(
      provider,
      newRes.map((r) => r.providerId)
    );
    const set = new Set(existed.map((r) => r.providerId));

    const realNewRes = newRes.filter((r) => !set.has(r.providerId));
    realNewRes.forEach((r) => visited.set(r.providerId, r));

    sys.logger.info(`Fetched ${realNewRes.length} new ${provider} resources at page ${page}`);

    if (realNewRes.length === 0) break;
  }

  sys.logger.success(`Fetched ${visited.size} new ${provider} resources in total`);

  return [...visited.values()];
}

export async function fetchResourcePages(
  sys: System,
  provider: string,
  fetch: (page: number) => Promise<ScrapedResource[]>,
  start: number,
  end: number
) {
  const visited = new Map<string, ScrapedResource>();

  for (let page = start; page <= end; page++) {
    sys.logger.info(`Start fetching ${provider} resources at page ${page}`);

    const resp = await fetch(page);
    const newRes = resp.filter((r) => !visited.has(r.providerId));
    newRes.forEach((r) => visited.set(r.providerId, r));

    sys.logger.info(`Fetched ${newRes.length} ${provider} resources at page ${page}`);
  }

  sys.logger.success(`Fetched ${visited.size} new ${provider} resources in total`);

  return [...visited.values()];
}
