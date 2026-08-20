import type { ProviderInfo } from '../schema/users.ts';

export type PartyKind = 'user' | 'team';

/** Data-backed spelling and symbol corrections applied to every provider. */
const FIXED_PARTY_NAMES = new Map<string, string>([
  ['雪飄工作室(FLsnow)', '雪飄工作室'],
  ['雪飘工作室(FLsnow)', '雪飄工作室'],
  ['雪飘工作室', '雪飄工作室'],
  ['MC日劇字幕組(MCS)', 'MC日劇字幕組'],
  ['MC日剧字幕组', 'MC日劇字幕組'],
  ['幻樱砂之团(SCST)', '幻樱砂之团'],
  ['SNOW放映社(SnowSub)', 'SNOW放映社'],
  ['飞龙骑脸字幕组(G.I.A.N.T)', '飞龙骑脸字幕组'],
  ['紫音動漫&發佈組', '紫音动漫发布组'],
  ['紫音动漫&发布组', '紫音动漫发布组'],
  ['紫音字幕組', '紫音动漫发布组'],
  ['紫音字幕组', '紫音动漫发布组'],
  ['K&W-RAWS', 'KW-RAWS'],
  ['v-bird&Eros', 'v-bird-Eros'],
  ['H&C推广站', 'HC推广站'],
  ['#CHAT RUMBLE#', 'CHAT RUMBLE'],
  ['◆漫游FREEWIND工作室', '漫游FREEWIND工作室'],
  ['复活城&猫咪', '复活城猫咪'],
  ['梦幻旋律♪发布组', '梦幻旋律发布组'],
  ['樱桃花字幕组&sakura-hana', '樱桃花字幕组'],
  ['天月動漫&發佈組', '天月動漫發佈組'],
  ['天月动漫&发布组', '天月動漫發佈組'],
  ['六四位元字幕组', '六四位元字幕組'],
  ['君の名は。FANS字幕组', '君の名は。FANS字幕組'],
  ['指原x樱花字幕组', '指原'],
  ['指原x櫻花字幕組', '指原'],
  ['得宗字幕组×拾月出云', '得宗字幕组']
]);

const PARTY_KIND_NAMES: Record<PartyKind, Map<string, string>> = {
  user: new Map([['Astral Union', 'Astral-Union']]),
  team: new Map([
    ['Astral Union', 'Astral-Union字幕组'],
    ['Astral Union字幕组', 'Astral-Union字幕组']
  ])
};

/** Removes boundary noise and applies only explicitly verified name corrections. */
export function normalizePartyName(name: string, kind: PartyKind) {
  const cleaned = name.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
  return PARTY_KIND_NAMES[kind].get(cleaned) ?? FIXED_PARTY_NAMES.get(cleaned) ?? cleaned;
}

/** Appends an observed old name while keeping provider aliases unique and minimal. */
export function appendProviderAliases(
  info: ProviderInfo,
  canonicalName: string,
  ...names: Array<string | undefined>
) {
  const aliases = new Set(info.aliases ?? []);
  for (const name of names) {
    if (name && name !== canonicalName) {
      aliases.add(name);
    }
  }

  aliases.delete(canonicalName);
  const next = [...aliases];
  if (next.length > 0) {
    info.aliases = next;
  } else {
    delete info.aliases;
  }
  return info;
}
