import type { Resource } from '@animegarden/client';

const FansubNames = [
  '北宇治字幕组',
  'LoliHouse',
  '喵萌奶茶屋',
  'Prejudice-Studio',
  '三明治摆烂组',
  'SweetSub',
  'S1百综字幕组',
  '星空字幕组',
  '桜都字幕组',
  '悠哈C9字幕社',
  '悠哈璃羽字幕社',
  '拨雪寻春',
  'MingYSub',
  '幻樱字幕组',
  '离谱Sub',
  '爱恋字幕社',
  'ANi'
];
const FansubOrder = new Map<string, number>(FansubNames.map((name, i) => [name, i]));

export function groupResourcesByFansub(resources: Resource<{ tracker: true }>[]) {
  const fansubMap = new Map<number, Resource<{ tracker: true }>[]>();
  const otherMap = new Map<number, Resource<{ tracker: true }>[]>();
  for (const resource of resources) {
    const publisher = resource.publisher;
    const fansub = resource.fansub;
    if (fansub) {
      fansubMap.set(fansub.id, [...(fansubMap.get(fansub.id) || []), resource]);
    } else {
      otherMap.set(publisher.id, [...(otherMap.get(publisher.id) || []), resource]);
    }
  }
  const groups = [
    ...[...fansubMap.entries()].map(([_, resources]) => ({
      publisher: resources[0].publisher,
      fansub: resources[0].fansub,
      resources
    })),
    ...[...otherMap.entries()].map(([_, resources]) => ({
      publisher: resources[0].publisher,
      fansub: undefined,
      resources
    }))
  ].sort((a, b) => {
    const orderA =
      (a.fansub ? FansubOrder.get(a.fansub.name) : undefined) ?? FansubOrder.get(a.publisher.name);
    const orderB =
      (b.fansub ? FansubOrder.get(b.fansub.name) : undefined) ?? FansubOrder.get(b.publisher.name);

    if (orderA !== undefined && orderB !== undefined) {
      return orderA - orderB;
    } else if (orderA !== undefined) {
      return -1;
    } else if (orderB !== undefined) {
      return 1;
    } else {
      return a.publisher.name.localeCompare(b.publisher.name);
    }
  });
  return groups;
}
