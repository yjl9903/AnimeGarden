import type { Context } from './context.js';

import { Token } from './tokenizer/index.js';

const WrappedEpisodeRE1 =
  /^(?<type>TV|OVA|OAD|SP)?(?<ep1>\d+)(?:\.(?<sub>\d))?(?:[vV](?<version>\d+))?(?:(?:\s+|_|-)?(?<ep_type>[^\d集]+))?$|^第(?<ep2>\d+)[集话話]$|^S(?<season>\d+)E(?<ep3>\d+)((?:[_|（])?(?<ep_type>[^\d][^）]*)(?:）)?)?$/;
const WrappedEpisodeRE2 = /^(?<ep1>\d+)(?:\+(?<type>[^\d]+)|,|&|、)(?<ep2>\d+)$/;
const WrappedSeasonRE = /^(?:S|Season)(\d+)\s*(Fin|End)?$/;
const WrappedMovieRE = /^Movie [vV](\d+)$/;

const WrappedEpisodesRange1 =
  /^(?<type>TV|OVA|OAD|SP)?(?<ep1>\d+)(?:\.(?<sub1>\d))?[-~](?<ep2>\d+)(?:\.(?<sub2>\d))?\s*[_]?(?<range_type>.*)$/;
const WrappedEpisodesRange2 = /^全(\d+)集$/;

const WrappedSeasonsRE = /^S(?<season1>\d)\+S(?<season2>\d)$/;
const WrappedSeasonsRangeRE = /^S(?<season1>\d)-S(?<season2>\d)$/;

const WrappedVolumeRE = /^(?:Vol|vol|Volume|volume)\.?\s*(?<vol>\d+)$/;
const WrappedVolumesRangeRE =
  /^(?:Vol|vol|Volume|volume)\.?\s*(?<vol1>\d+)-(?<vol2>\d+)\s+(?<type>.*)$/;

export function matchEpiodes(ctx: Context, text: string) {
  text = text.trimEnd();

  // 1. Single episode
  {
    const res = WrappedEpisodeRE1.exec(text);
    if (res) {
      const epText = res.groups?.ep1! || res.groups?.ep2! || res.groups?.ep3!;
      const ep = +epText;
      if (!Number.isNaN(ep)) {
        // Handle year: [2024]
        if (1949 <= ep && ep <= 2099 && text === epText && ctx.hasEpisode) {
          ctx.update('year', ep);
          return true;
        }

        ctx.update2('episode', 'number', ep);

        // 1.5
        if (res.groups?.sub && !Number.isNaN(+res.groups.sub)) {
          ctx.update2('episode', 'numberSub', +res.groups.sub);
        }

        // 3v2
        if (res.groups?.version && !Number.isNaN(+res.groups.version)) {
          ctx.update('version', +res.groups.version);
        }

        // SP01 OVA01
        if (res.groups?.type) {
          const type = res.groups.type.trim();
          ctx.update('type', type);
        }

        // 01 END
        if (res.groups?.ep_type) {
          const type = res.groups.ep_type.trim();
          ctx.update2('episode', 'type', type);
        }

        // S01E01
        if (res.groups?.season && !Number.isNaN(+res.groups.season)) {
          const season = +res.groups.season;
          ctx.update2('season', 'number', season);
        }

        return true;
      }
    }
  }
  {
    // 06,07 07+ES07
    const res = WrappedEpisodeRE2.exec(text);
    if (res) {
      const ep1 = res.groups?.ep1 ? +res.groups.ep1 : NaN;
      const ep2 = res.groups?.ep2 ? +res.groups.ep2 : NaN;
      const type = res.groups?.type;
      if (!Number.isNaN(ep1) && !Number.isNaN(ep2)) {
        if (type) {
          ctx.update2('episode', 'number', ep1);
          ctx.update('episodes', [
            {
              number: ep2,
              type
            }
          ]);
        } else {
          ctx.update('episodes', [
            {
              number: ep1
            },
            {
              number: ep2
            }
          ]);
        }
        return true;
      }
    }
  }
  {
    // [Movie] / [Movie v2]
    const res = WrappedMovieRE.exec(text);
    if (res) {
      if (res[1] && !Number.isNaN(res[1])) {
        ctx.update('version', +res[1]);
      }
      ctx.update('type', 'Movie');
      return true;
    }
  }

  // 2. Episodes range
  {
    // 01-26
    const res = WrappedEpisodesRange1.exec(text);
    if (res) {
      const from = res.groups?.ep1 ? +res.groups.ep1 : NaN;
      const to = res.groups?.ep2 ? +res.groups.ep2 : NaN;
      if (!Number.isNaN(from) && !Number.isNaN(to)) {
        ctx.update2('episodesRange', 'from', from);
        ctx.update2('episodesRange', 'to', to);

        const type = res.groups?.type ? res.groups.type.trim() : undefined;
        if (type) {
          ctx.update('type', type);
        }

        const episodesRangeType = res.groups?.range_type ? res.groups.range_type.trim() : undefined;
        if (episodesRangeType) {
          const exec2 = /[vV](\d+)$/.exec(episodesRangeType);

          if (exec2) {
            const version = +exec2[1];
            if (!Number.isNaN(version)) {
              ctx.update('version', version);
              ctx.update2(
                'episodesRange',
                'type',
                episodesRangeType.slice(0, episodesRangeType.length - exec2[0].length)
              );
            } else {
              ctx.update2('episodesRange', 'type', episodesRangeType);
            }
          } else {
            ctx.update2('episodesRange', 'type', episodesRangeType);
          }
        }

        // 12.5-23
        const sub1 = res.groups?.sub1 ? +res.groups?.sub1 : NaN;
        const sub2 = res.groups?.sub2 ? +res.groups?.sub2 : NaN;
        if (!Number.isNaN(sub1)) {
          ctx.update2('episodesRange', 'fromSub', sub1);
        }
        if (!Number.isNaN(sub2)) {
          ctx.update2('episodesRange', 'toSub', sub2);
        }

        return true;
      }
    }
  }
  {
    // 全26集
    const res = WrappedEpisodesRange2.exec(text);
    if (res) {
      const to = +res[1];
      if (!Number.isNaN(to)) {
        ctx.update2('episodesRange', 'from', 1);
        ctx.update2('episodesRange', 'to', to);
        return true;
      }
    }
  }

  // 3. Season
  {
    const res = WrappedSeasonRE.exec(text);
    if (res) {
      const season = +res[1];
      if (!Number.isNaN(season)) {
        ctx.update2('season', 'number', season);

        const tag = res[2];
        if (tag) {
          ctx.tags.push(tag.trim());
        }
        return true;
      }
    }
  }

  // 4. Seasons Range
  {
    const res = WrappedSeasonsRE.exec(text);
    if (res) {
      const season1 = res.groups?.season1 ? +res.groups.season1 : NaN;
      const season2 = res.groups?.season2 ? +res.groups.season2 : NaN;
      if (!Number.isNaN(season1) && !Number.isNaN(season2)) {
        ctx.update('seasons', [{ number: season1 }, { number: season2 }]);
      }
      return true;
    }
  }
  {
    // Vol.1-4 Fin
    const res = WrappedSeasonsRangeRE.exec(text);
    if (res) {
      const season1 = res.groups?.season1 ? +res.groups.season1 : NaN;
      const season2 = res.groups?.season2 ? +res.groups.season2 : NaN;
      if (!Number.isNaN(season1) && !Number.isNaN(season2)) {
        ctx.update2('seasonsRange', 'from', season1);
        ctx.update2('seasonsRange', 'to', season2);
      }
      return true;
    }
  }

  // 5. Volume
  {
    const res = WrappedVolumeRE.exec(text);
    if (res) {
      const vol = res.groups?.vol ? +res.groups.vol : NaN;
      if (!Number.isNaN(vol)) {
        ctx.update2('volume', 'number', vol);
        return true;
      }
    }
  }
  {
    const res = WrappedVolumesRangeRE.exec(text);
    if (res) {
      const vol1 = res.groups?.vol1 ? +res.groups.vol1 : NaN;
      const vol2 = res.groups?.vol2 ? +res.groups.vol2 : NaN;
      const type = res.groups?.type;
      if (!Number.isNaN(vol1) && !Number.isNaN(vol2)) {
        ctx.update2('volumesRange', 'from', vol1);
        ctx.update2('volumesRange', 'to', vol1);
        if (type) {
          ctx.update2('volumesRange', 'type', type);
        }
        return true;
      }
    }
  }

  return false;
}

export function parseWrappedEpisodes(ctx: Context) {
  if (ctx.hasEpisode) {
    return true;
  }

  const token = ctx.tokens[ctx.right];
  if (token.isWrapped && matchEpiodes(ctx, token.text)) {
    ctx.right -= 1;
    return true;
  }

  return false;
}

const SuffixEpisodeRE = [
  /\s*- (?<type>SP|OVA)?(?<ep1>\d+)(?:\.(?<sub>\d))?(?:[vV](?<version>\d+))?(?<ep_type>\s+[^\-]*)?(?:\s*-)?$/,
  /\s+S(?<season>\d+)E(?<ep1>\d+)$/,
  /\s*第(?<ep1>\d+)(?:\.(?<sub>\d))?[集话話]$/,
  /\s+S(?<season1>\d+)-S(?<season2>\d+)$/
];
const SuffixepisodesRangeRE = /- (?<from>\d+)-(?<to>\d+)(?:\s+(?<type>.+))?$/;

export const Types = new Set([
  'GEKIJOUBAN',
  'MOVIE',
  'OAD',
  'OAV',
  'ONA',
  'OVA',
  'SPECIAL',
  'SPECIALS',
  'TV',
  '开播纪念特别篇',
  '開播紀念特別篇',
  '开篇纪念特别篇',
  '開篇紀念特別篇',
  '特别篇',
  '特別篇',
  '特別編',
  '特别话',
  '特別话',
  '特別話',
  '番外篇',
  '番外編',
  '剧场版',
  '劇場版',
  '总集篇',
  '總集篇',
  //
  '广播剧',
  '朗读剧',
  //
  'SP',
  //
  'ED',
  'ENDING',
  'NCED',
  'NCOP',
  'OP',
  'OPENING',
  'PREVIEW',
  'PV',
  '特别篇PV',
  //
  '合集',
  '修正合集'
]);

export function parseSuffixTextInlineEpisodes(ctx: Context, text: string) {
  if (ctx.hasEpisode) {
    return text;
  }

  text = text.trimEnd();

  // - 01-24 修正合集
  {
    const res = SuffixepisodesRangeRE.exec(text);
    if (res) {
      const from = res.groups?.from ? +res.groups.from : NaN;
      const to = res.groups?.to ? +res.groups.to : NaN;
      if (!Number.isNaN(from) && !Number.isNaN(to)) {
        ctx.update2('episodesRange', 'from', from);
        ctx.update2('episodesRange', 'to', to);

        const type = res.groups?.type?.trim();
        if (type) {
          const version = /[vV](\d+)$/.exec(type);
          if (version) {
            const versionNumber = +version[1];
            if (!Number.isNaN(versionNumber)) {
              ctx.update('version', versionNumber);
              const typeWithoutVersion = type.slice(0, type.length - version[0].length).trim();
              if (typeWithoutVersion) {
                ctx.update2('episodesRange', 'type', typeWithoutVersion);
              }
            } else {
              ctx.update2('episodesRange', 'type', type);
            }
          } else {
            ctx.update2('episodesRange', 'type', type);
          }
        }

        return text.slice(0, text.length - res[0].length).trimEnd();
      }
    }
  }

  // episodes
  for (const RE of SuffixEpisodeRE) {
    const res = RE.exec(text);
    if (res) {
      const ep = res.groups?.ep1 ? +res.groups?.ep1 : NaN;
      if (!Number.isNaN(ep)) {
        if (res.groups?.type) {
          ctx.update('type', res.groups.type);
        }

        ctx.update2('episode', 'number', ep);

        // 1.5
        const numberSub = res.groups?.sub ? +res.groups?.sub : NaN;
        if (numberSub && !Number.isNaN(numberSub)) {
          ctx.update2('episode', 'numberSub', numberSub);
        }

        // v2
        const version = res.groups?.version ? +res.groups.version : NaN;
        if (version && !Number.isNaN(version)) {
          ctx.update('version', version);
        }

        // S02Exx
        const season = res.groups?.season ? +res.groups.season : NaN;
        if (!Number.isNaN(season)) {
          ctx.update2('season', 'number', season);
        }

        // Remove token suffix
        return text.slice(0, text.length - res[0].length).trimEnd();
      }

      // S1-S2
      {
        const season1 = res.groups?.season1 ? +res.groups.season1 : NaN;
        const season2 = res.groups?.season2 ? +res.groups.season2 : NaN;
        if (!Number.isNaN(season1) && !Number.isNaN(season2) && season1 < season2) {
          ctx.update2('seasonsRange', 'from', season1);
          ctx.update2('seasonsRange', 'to', season2);

          // Remove token suffix
          return text.slice(0, text.length - res[0].length).trimEnd();
        }
      }
    }
  }

  // - 特别篇
  for (const type of Types) {
    const toMatch = ` - ${type}`;
    if (text.endsWith(toMatch)) {
      ctx.update('type', type);

      // Remove token suffix
      return text.slice(0, text.length - toMatch.length).trimEnd();
    }
  }

  return text;
}

export function parseSuffixEpisodes(ctx: Context) {
  if (ctx.hasEpisode) {
    return true;
  }

  const token = ctx.tokens[ctx.right];
  const text = token.text.trimEnd();

  if (token.isWrapped) {
    return parseWrappedEpisodes(ctx);
  } else {
    const trimmed = parseSuffixTextInlineEpisodes(ctx, text);
    if (trimmed !== text) {
      ctx.tokens[ctx.right] = new Token(trimmed, token.left, token.right);
      return true;
    }
  }

  return false;
}

// Season regexp
const SuffixSeasonOrEpisodesRes: Array<[RegExp, (res: RegExpExecArray, ctx: Context) => boolean]> =
  [
    [
      /Parts? (\d+)$/,
      (res, ctx) => {
        const part = +res[1];
        if (!Number.isNaN(part)) {
          ctx.update2('part', 'number', part);
          return true;
        }
        return false;
      }
    ],
    [
      /第\s*(\d+)\s*部分$/,
      (res, ctx) => {
        const part = +res[1];
        if (!Number.isNaN(part)) {
          ctx.update2('part', 'number', part);
          return true;
        }
        return false;
      }
    ],
    [
      /(?:S|Season\s?)(\d+)$/,
      (res, ctx) => {
        const season = +res[1];
        if (!Number.isNaN(season)) {
          if (!ctx.result.season?.number || ctx.result.season.number === season) {
            ctx.update2('season', 'number', season);
            return true;
          }
        }
        return false;
      }
    ],
    [
      /(1st|2nd|3rd|[456789]th) Season$/,
      (res, ctx) => {
        const season = Number.parseInt(res[1]);
        if (!Number.isNaN(season)) {
          if (!ctx.result.season?.number || ctx.result.season.number === season) {
            ctx.update2('season', 'number', season);
            return true;
          }
        }
        return false;
      }
    ],
    [
      /(?:-\s+)(Third) Season$/,
      (res, ctx) => {
        const season = { Third: 3 }[res[1]];
        if (season && !Number.isNaN(season)) {
          if (!ctx.result.season?.number || ctx.result.season.number === season) {
            ctx.update2('season', 'number', season);
            return true;
          }
        }
        return false;
      }
    ],
    [
      /第?(\d+)[季期]$/,
      (res, ctx) => {
        const season = +res[1];
        if (!Number.isNaN(season)) {
          if (!ctx.result.season?.number || ctx.result.season.number === season) {
            ctx.update2('season', 'number', season);
            return true;
          }
        }
        return false;
      }
    ],
    [
      /第?((?:[零一二三四五六七八九]十)?[零一二三四五六七八九])[季期]$/,
      (res, ctx) => {
        const text = res[1];
        const map = {
          零: 0,
          一: 1,
          二: 2,
          三: 3,
          四: 4,
          五: 5,
          六: 6,
          七: 7,
          八: 8,
          九: 9
        };
        const base =
          text.length === 2 && text[0] === '十'
            ? 1
            : text.length === 3
              ? map[text[0] as keyof typeof map]!
              : 0;
        const offset = map[text[text.length - 1] as keyof typeof map];
        const season = base * 10 + offset;
        if (!ctx.result.season?.number || ctx.result.season.number === season) {
          ctx.update2('season', 'number', season);
          return true;
        }
        return false;
      }
    ],
    [
      /(?:Vol|vol|Volume|volume)\.?\s*(?<vol>\d+)$/,
      (res, ctx) => {
        const vol = res.groups?.vol ? +res.groups.vol : NaN;
        if (!Number.isNaN(vol)) {
          ctx.update2('volume', 'number', vol);
          return true;
        }
        return false;
      }
    ],
    [
      /\s+[vV](\d+)$/,
      (res, ctx) => {
        const version = +res[1];
        if (!Number.isNaN(version)) {
          ctx.update('version', version);
          return true;
        }
        return false;
      }
    ],
    [
      /\s+(?<ep1>\d+)$|\((?<ep2>\d+)\)$/,
      (res, ctx) => {
        const text = res.groups?.ep1 ?? res.groups?.ep2;
        const season = text !== undefined ? +text : NaN;
        if (!Number.isNaN(season) && ctx.hasEpisode) {
          if (!ctx.result.season?.number || ctx.result.season.number === season) {
            ctx.update2('season', 'number', season);
            return true;
          } else if (
            (!ctx.result.year || ctx.result.year === season) &&
            1949 <= season &&
            season <= 2099
          ) {
            ctx.update('year', season);
            return true;
          }
        }
        return false;
      }
    ]
  ];

export function parseSuffixTextInlineSeason(ctx: Context, text: string) {
  let changed = false;
  do {
    changed = false;
    text = text.trimEnd();
    for (const [re, fn] of SuffixSeasonOrEpisodesRes) {
      const res = re.exec(text);
      if (res && fn(res, ctx)) {
        changed = true;
        text = text.slice(0, text.length - res[0].length).trimEnd();
      }
    }
  } while (changed);
  return text;
}
