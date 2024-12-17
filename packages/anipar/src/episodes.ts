import { Context } from './context';

const WrappedEpisodeRE = /^(?<ep1>\d+)(?:\.(\d))?(?:[vV](\d+))?$|^第(?<ep2>\d+)[集话]$/;

const EpisodesRange1 = /^(\d+)-(\d+)(?:\s*.*)$/;
const EpisodesRange2 = /^全(\d+)集$/;

export function parseWrappedEpisodes(ctx: Context) {
  const token = ctx.tokens[ctx.right];
  const text = token.text;
  if (token.isWrapped) {
    // 1. Single episode
    {
      const res = WrappedEpisodeRE.exec(text);
      if (res) {
        const ep = +(res.groups?.ep1! || res.groups?.ep2!);
        if (!Number.isNaN(ep)) {
          ctx.update2('episode', 'number', ep);
          // 1.5
          if (res[2] && !Number.isNaN(res[2])) {
            ctx.update2('episode', 'numberSub', +res[2]);
          }
          // 3v2
          if (res[3] && !Number.isNaN(res[3])) {
            ctx.update('version', +res[3]);
          }
          ctx.right -= 1;
          return true;
        }
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
          ctx.right -= 1;
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
          ctx.right -= 1;
          return true;
        }
      }
    }
  }
  return false;
}

const SuffixEpisodeRE = /- (\d+)(?:\.(\d))?$/;

export function parseSuffixEpisodes(ctx: Context) {
  if (ctx.result.episode || ctx.result.episodes || ctx.result.episodeRange) {
    return true;
  }

  const token = ctx.tokens[ctx.right];
  const text = token.text;
  {
    const res = SuffixEpisodeRE.exec(text);
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
