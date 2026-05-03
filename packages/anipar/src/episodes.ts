import type { Context } from './context.js';

import { Token } from './tokenizer/index.js';

const WrappedEpisodeRE = /^(?<ep1>\d+)(?:\.(\d))?(?:[vV](\d+))?$|^第(?<ep2>\d+)[集话話]$/;
const WrappedSeasonRE = /^(?:S|Season)(\d+)\s*(Fin|End)?$/;
const WrappedMovieRE = /^Movie [vV](\d+)$/;

const EpisodesRange1 = /^(\d+)-(\d+)\s*(.*)$/;
const EpisodesRange2 = /^全(\d+)集$/;

export function matchEpiodes(ctx: Context, text: string) {
  text = text.trimEnd();

  // 1. Single episode
  {
    const res = WrappedEpisodeRE.exec(text);
    if (res) {
      const epText = res.groups?.ep1! || res.groups?.ep2!;
      const ep = +epText;
      if (!Number.isNaN(ep)) {
        // Handle year: [2024]
        if (1949 <= ep && ep <= 2099 && text === epText && ctx.hasEpisode) {
          ctx.update('year', ep);
          return true;
        }

        ctx.update2('episode', 'number', ep);
        // 1.5
        if (res[2] && !Number.isNaN(res[2])) {
          ctx.update2('episode', 'numberSub', +res[2]);
        }
        // 3v2
        if (res[3] && !Number.isNaN(res[3])) {
          ctx.update('version', +res[3]);
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

  // 2. Episode range
  {
    // 01-26
    const res = EpisodesRange1.exec(text);
    if (res) {
      const from = +res[1];
      const to = +res[2];
      if (!Number.isNaN(from) && !Number.isNaN(to)) {
        ctx.update2('episodesRange', 'from', from);
        ctx.update2('episodesRange', 'to', to);

        const type = res[3] ? res[3].trim() : undefined;
        if (type) {
          const exec2 = /[vV](\d+)$/.exec(type);

          if (exec2) {
            const version = +exec2[1];
            if (!Number.isNaN(version)) {
              ctx.update('version', version);
              ctx.update2('episodesRange', 'type', type.slice(0, type.length - exec2[0].length));
            } else {
              ctx.update2('episodesRange', 'type', type);
            }
          } else {
            ctx.update2('episodesRange', 'type', type);
          }
        }

        return true;
      }
    }
  }
  {
    // 全26集
    const res = EpisodesRange2.exec(text);
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
  /\s*- (?<sp>SP)?(?<ep1>\d+)(?:\.(?<sub>\d))?(?:[vV](?<version>\d+))?(?:\s*-)?$/,
  /\s*第(?<ep1>\d+)(?:\.(?<sub>\d))?[集话話]$/
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
  'PV'
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
        if (res.groups?.sp) {
          ctx.update('type', res.groups.sp);
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

        // Remove token suffix
        return text.slice(0, text.length - res[0].length).trimEnd();
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
  const trimmed = parseSuffixTextInlineEpisodes(ctx, text);

  if (trimmed !== text) {
    ctx.tokens[ctx.right] = new Token(trimmed, token.left, token.right);
    return true;
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
