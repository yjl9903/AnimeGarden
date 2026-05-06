import type { Context } from './context.js';

const FansubTags = new Set(['個人製作合集', '代发', '羊圈个人译制']);

export const enum Fansub {
  Kirara_Fantasia = 'Kirara Fantasia',
  ANi = 'ANi',
  LoliHouse = 'LoliHouse',
  绿茶字幕组 = '绿茶字幕组',
  桜都字幕组 = '桜都字幕组',
  Prejudice_Studio = 'Prejudice-Studio',
  沸班亚马制作组 = '沸班亚马制作组',
  喵萌奶茶屋 = '喵萌奶茶屋',
  猎户发布组 = '猎户发布组',
  爱恋字幕社 = '爱恋字幕社',
  拨雪寻春 = '拨雪寻春',
  雪飄工作室 = '雪飄工作室(FLsnow)',
  幻樱字幕组 = '幻樱字幕组',
  GMTeam = 'GMTeam',
  三明治摆烂组 = '三明治摆烂组',
  星空字幕组 = '星空字幕组',
  北宇治字幕组 = '北宇治字幕组',
  极影字幕社 = '极影字幕社',
  MingYSub = 'MingYSub',
  黑白字幕组 = '黑白字幕组',
  S1百综字幕组 = 'S1百综字幕组'
}

export function parseFansub(ctx: Context) {
  // [個人製作合集][fansub] ...
  const tags: string[] = [];
  while (ctx.left <= ctx.right && FansubTags.has(ctx.tokens[ctx.left].text)) {
    tags.push(ctx.tokens[ctx.left].text);
    ctx.left += 1;
  }
  if (tags.length > 0) {
    ctx.update2('fansub', 'tags', tags);
  }

  if (ctx.left + 1 > ctx.right) {
    return false;
  }

  // [fansub] ...
  const token = ctx.tokens[ctx.left];
  if (token.isWrapped) {
    const text = token.text;

    // @hack jibaketa
    if (text.startsWith('jibaketa合成&') || text === 'jibaketa') {
      ctx.update2('fansub', 'name', 'jibaketa');
      if (text !== 'jibaketa') {
        ctx.update2('fansub', 'alias', text);
      }
      ctx.left += 1;
      return true;
    }

    let found = false;
    const seps = ['&', '＆', '·', '，'];
    for (const sep of seps) {
      const [name, ...collab] = text
        .split(sep)
        .map((t) => t.trim())
        .filter(Boolean);

      if (collab.length > 0) {
        found = true;
        if (
          ctx.result.fansub?.name &&
          ctx.result.fansub.name !== name &&
          !collab.includes(ctx.result.fansub.name)
        ) {
          ctx.update2('fansub', 'alias', name);
        } else {
          ctx.update2('fansub', 'name', name);
        }
        ctx.update2('fansub', 'collab', collab);
        break;
      }
    }

    if (!found) {
      if (ctx.result.fansub?.name && ctx.result.fansub.name !== text) {
        ctx.update2('fansub', 'alias', text);
      } else {
        ctx.update2('fansub', 'name', text);
      }
    }

    ctx.left += 1;

    return true;
  }

  return false;
}
