import { Context } from './context';
import { parseSuffixEpisodes, parseSuffixSeasonOrEpisodes } from './episodes';

export function parseFansub(ctx: Context) {
  // [fansub] title
  if (ctx.left + 1 > ctx.right) {
    return false;
  }

  const token = ctx.tokens[ctx.left];
  if (token.isWrapped) {
    const text = token.text;

    let found = false;
    const seps = ['&', '·'];
    for (const sep of seps) {
      const [name, ...collab] = text.split(sep);

      if (collab.length > 0) {
        // Hack: [jibaketa合成&壓制]
        if (collab.length === 1 && collab[0] === '壓制') {
          break;
        }

        found = true;
        ctx.update2('fansub', 'name', name);
        ctx.update2('fansub', 'collab', collab);
        break;
      }
    }

    if (!found) {
      ctx.update2('fansub', 'name', text);
    }

    ctx.left += 1;

    return true;
  }

  return false;
}

export function parseTitle(ctx: Context) {
  // 1. Parse suffix episodes
  parseSuffixEpisodes(ctx);

  // 2. Parse titles
  const rest = ctx.tokens.slice(ctx.left, ctx.right + 1);
  if (rest.length === 0) return false;

  const text = rest.length === 1 ? rest[0].text : rest.map((t) => t.toString()).join('');

  // 2.1. Try split multiple titles
  let found = false;
  const separators = ['/', '\\'];
  for (const sep of separators) {
    const parts = text
      .split(sep)
      .map((t) => t.trim())
      .filter((t) => !!t);
    if (parts.length > 1) {
      const [title, ...other] = parts;

      const trimmedTitle = parseSuffixSeasonOrEpisodes(ctx, title);
      const trimmedOther = other
        .map((t) => parseSuffixSeasonOrEpisodes(ctx, t))
        .map((t) => t.trim())
        .filter((t) => !!t);

      ctx.update('title', trimmedTitle);
      if (trimmedOther.length > 0) {
        ctx.update('titles', trimmedOther);
      }
      found = true;
    }
  }
  if (!found) {
    const trimmed = parseSuffixSeasonOrEpisodes(ctx, text);
    ctx.update('title', trimmed);
  }

  return true;
}
