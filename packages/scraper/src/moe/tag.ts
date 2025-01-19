import type { ResourceType } from '@animegarden/client';

export const Anime = '549ef207fe682f7549f1ea90';

export const Collection = '54967e14ff43b99e284d0bf7';

export const Music = '549eef6ffe682f7549f1ea8b';

export const Manga = '549eefebfe682f7549f1ea8c';

export const TV = '549ff1db30bcfc225bf9e607';

export const Other = '549ef250fe682f7549f1ea91';

export const Game = '549ef015fe682f7549f1ea8d';

export function getType(tags: string[]): ResourceType {
  for (const tag of tags) {
    switch (tag) {
      case Anime:
        return '動畫';
      case Collection:
        return '季度全集';
      case Manga:
        return '漫畫';
      case Music:
        return '音樂';
      case TV:
        return '日劇';
      case Game:
        return '遊戲';
      case Other:
        return '其他';
      default:
    }
  }
  return '其他';
}
