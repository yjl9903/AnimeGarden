import { Context } from './context';
import { parseSuffixEpisodes } from './episodes';
import { parseSuffixSeasonOrEpisodes } from './keyword';

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
        if (collab.length === 1 && collab[0].endsWith('壓制')) {
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

  // 2.1. Try split multiple titles
  let found = false;
  const separators = ['/', '\\'];
  const matchParts = (parts: string[]) => {
    const [title, ...other] = parts;

    const trimmedTitle = parseSuffixSeasonOrEpisodes(ctx, title);
    const trimmedOther = other
      .map((t) => parseSuffixSeasonOrEpisodes(ctx, t))
      .map((t) => t.trim())
      .filter((t) => !!t && t !== trimmedTitle);

    ctx.update('title', trimmedTitle);
    if (trimmedOther.length > 0) {
      ctx.update('titles', trimmedOther);
    }
  };

  // [xxx][yyy]
  if (rest.length > 1 && rest.every((t) => t.isWrapped)) {
    matchParts(rest.map((t) => t.text));
    found = true;
  }

  if (!found) {
    const text = rest.length === 1 ? rest[0].text : rest.map((t) => t.toString()).join('');

    for (const sep of separators) {
      const parts = splitText(text, sep)
        .map((t) => t.trim())
        .filter((t) => !!t);
      if (parts.length > 1) {
        matchParts(parts);
        found = true;
        break;
      }
    }

    if (!found) {
      const trimmed = parseSuffixSeasonOrEpisodes(ctx, text);
      ctx.update('title', trimmed);
    }
  }

  return true;
}

function splitText(text: string, sep: string) {
  const parts = text.split(sep);
  const ans = [];
  for (let i = 0; i < parts.length; i++) {
    if (i === 0) {
      ans.push(parts[i]);
    } else {
      // 【喵萌奶茶屋】★10月新番★[乱马 1/2 2024年版 / Ranma ½ / Ranma 1/2 (2024)][10][1080p][简日双语][招募翻译]
      if (sep === '/' && /\d$/.test(parts[i - 1]) && /^\d/.test(parts[i])) {
        ans.pop();
        ans.push(parts[i - 1] + '/' + parts[i]);
      } else {
        ans.push(parts[i]);
      }
    }
  }
  return ans;
}
