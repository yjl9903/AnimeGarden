import { Context } from './context';

export function parseFansub(ctx: Context) {
  if (ctx.left > ctx.right) {
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
  return true;
}
