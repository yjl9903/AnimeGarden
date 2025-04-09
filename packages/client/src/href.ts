import type { ProviderType } from './types';

export function transformResourceHref(provider: ProviderType, href?: string) {
  if (!href) return undefined;
  switch (provider) {
    case 'dmhy':
      return `https://share.dmhy.org/topics/view/${href}`;
    case 'moe':
      return `https://bangumi.moe/torrent/${href}`;
    case 'ani':
      return href;
    default:
      return undefined;
  }
}

export function transformPublisherHref(provider: ProviderType, publisherId?: string) {
  if (!publisherId) return undefined;
  switch (provider) {
    case 'dmhy':
      return `https://share.dmhy.org/topics/list/user_id/${publisherId}`;
    case 'moe':
      return `https://bangumi.moe/tag/${publisherId}`;
    case 'ani':
      return 'https://aniopen.an-i.workers.dev/';
    default:
      return undefined;
  }
}

export function transformFansubHref(provider: ProviderType, fansubId?: string) {
  if (!fansubId) return undefined;
  switch (provider) {
    case 'dmhy':
      return `https://share.dmhy.org/topics/list/team_id/${fansubId}`;
    case 'moe':
      return `https://bangumi.moe/tag/${fansubId}`;
    case 'ani':
      return 'https://aniopen.an-i.workers.dev/';
    default:
      return undefined;
  }
}
