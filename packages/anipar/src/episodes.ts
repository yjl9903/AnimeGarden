import { Context } from './context';

const WrappedEpisodeRE = /^(?<ep1>\d+)(?:\.(\d))?(?:[vV](\d+))?$|^第(?<ep2>\d+)[集话話]$/;
const WrappedMovieRE = /^Movie [vV](\d+)$/;

const EpisodesRange1 = /^(\d+)-(\d+)(?:\s*.*)$/;
const EpisodesRange2 = /^全(\d+)集$/;

export function parseWrappedEpisodes(ctx: Context) {
  const token = ctx.tokens[ctx.right];
  const text = token.text;
  if (token.isWrapped && matchEpiodes(ctx, text)) {
    ctx.right -= 1;
    return true;
  }
  return false;
}

export function matchEpiodes(ctx: Context, text: string) {
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
        ctx.update2('episodeRange', 'from', from);
        ctx.update2('episodeRange', 'to', to);
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
        ctx.update2('episodeRange', 'from', 1);
        ctx.update2('episodeRange', 'to', to);
        return true;
      }
    }
  }

  return false;
}

const SuffixEpisodeRE = [/- (\d+)(?:\.(\d))?$/, /第(\d+)(?:\.(\d))?[集话話]$/];

export function parseSuffixEpisodes(ctx: Context) {
  if (ctx.result.episode || ctx.result.episodes || ctx.result.episodeRange) {
    return true;
  }

  const token = ctx.tokens[ctx.right];
  const text = token.text;
  for (const RE of SuffixEpisodeRE) {
    const res = RE.exec(text);
    if (res) {
      const ep = +res[1];
      if (!Number.isNaN(ep)) {
        ctx.update2('episode', 'number', ep);

        // 1.5
        if (res[2] && !Number.isNaN(res[2])) {
          ctx.update2('episode', 'numberSub', +res[2]);
        }

        // Remove token suffix
        ctx.tokens[ctx.right] = token.slice(0, text.length - res[0].length).trim();

        return true;
      }
    }
  }
}

// Season regexp
export const SuffixSeasonOrEpisodesRes: Array<
  [RegExp, (res: RegExpExecArray, ctx: Context) => boolean]
> = [
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
    / (\d+)$/,
    (res, ctx) => {
      const season = +res[1];
      if (
        !Number.isNaN(season) &&
        (ctx.result.episode || ctx.result.episodes || ctx.result.episodeRange)
      ) {
        // Skip: Part 2
        if (/Parts? \d+$/.test(res.input)) {
          return false;
        }
        if (!ctx.result.season?.number || ctx.result.season.number === season) {
          ctx.update2('season', 'number', season);
          return true;
        }
      }
      return false;
    }
  ],
  [
    /(?<ep1>\d+)(?:\.(\d))?(?:[vV](\d+))?$|^第(?<ep2>\d+)[集话話]$/,
    (res, ctx) => {
      const ep = +(res.groups?.ep1! || res.groups?.ep2!);
      if (!Number.isNaN(ep)) {
        // Skip: Part 2
        if (/Parts? \d+$/.test(res.input)) {
          return false;
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
      return false;
    }
  ],
  [
    /（日配版）$/,
    (res, ctx) => {
      ctx.update('language', res[0]);
      return true;
    }
  ],
  [
    /（重播）$/,
    (res, ctx) => {
      ctx.tags.push(res[0]);
      return true;
    }
  ]
];
