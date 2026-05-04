import type { Context } from './context.js';

import { parseSuffixTextInlineTags } from './keyword.js';
import { parseSuffixTextInlineSeason } from './episodes.js';

interface SplitOptions {
  // /**
  //  * @default false
  //  */
  // nest?: boolean;

  /**
   * @default true
   */
  space?: boolean;

  /**
   * @default "['/', '-']"
   */
  separators?: string[];
}

function splitMultipleTitles(ctx: Context, options?: SplitOptions) {
  const { space = true, separators = ['/', '-'] } = options ?? {};

  const rest = ctx.tokens.slice(ctx.left, ctx.right + 1);
  if (rest.length === 0) return [];

  // [xxx][yyy] 已经被分割好了
  if (rest.length > 1 && rest.every((t) => t.isWrapped)) {
    return rest.map((r) => r.text.trim());
  }

  // "xxx" 或者 "[xxx]" 内的内容为一个整体 或者 "xxx [yyy] zzz" 被当成一个整体
  const fullText =
    rest.length === 1
      ? rest[0].text.trim()
      : rest
          .map((t) => t.toString())
          .join('')
          .trim();

  if (!fullText) return [];

  for (const separator of separators) {
    const parts = space ? fullText.split(` ${separator} `) : fullText.split(separator);
    const result: string[] = [];

    if (fullText.startsWith(separator) && parts.length > 0) {
      parts[0] += separator;
    }
    if (fullText.endsWith(separator) && parts.length > 0) {
      parts[parts.length - 1] += separator;
    }

    for (let i = 0; i < parts.length; i += 1) {
      if (!space && separator === '/' && i + 1 < parts.length) {
        if (
          // Fate/Grand Order 命运/冠位指定
          parts[i].toUpperCase().endsWith('FATE') ||
          parts[i].toUpperCase().endsWith('命运') ||
          parts[i].toUpperCase().endsWith('命運') ||
          // Ramma 1/2 22/7
          (/\d$/.test(parts[i]) && /^\d/.test(parts[i + 1]))
        ) {
          result.push(parts[i] + separator + parts[i + 1]);
          i += 1;
          continue;
        }
      }

      result.push(parts[i]);
    }

    if (result.length > 1) {
      return result.map((t) => t.trim());
    }
  }

  return [fullText.trim()];
}

export function parseSingleTitleText(ctx: Context, text: string) {
  // [ANi]  ATRI -My Dear Moments-（僅限港澳台） - 07 [1080P][Bilibili][WEB-DL][AAC AVC][CHT CHS][MP4]
  text = parseSuffixTextInlineTags(ctx, text).trimEnd();
  text = parseSuffixTextInlineSeason(ctx, text).trimEnd();
  text = parseSuffixTextInlineTags(ctx, text).trimEnd();
  return text;
}

export function parseMultipleTitles(ctx: Context, options?: SplitOptions) {
  const titles = splitMultipleTitles(ctx, options);
  if (titles.length === 0) return [];

  const trimmedTitles = titles.map((t) => parseSingleTitleText(ctx, t)).filter(Boolean);
  const trimmedTitle = trimmedTitles[0];

  ctx.update('title', trimmedTitle);

  const otherTitles = [...new Set(trimmedTitles)].filter((t) => t !== trimmedTitle);
  if (otherTitles.length > 0) {
    ctx.update('titles', otherTitles);
  }

  return [trimmedTitle, ...otherTitles];
}

export function parseSingleTitle(ctx: Context) {
  const rest = ctx.tokens.slice(ctx.left, ctx.right + 1);
  if (rest.length === 0) return '';

  const fullText =
    rest.length === 1
      ? rest[0].text.trim()
      : rest
          .map((t) => t.toString())
          .join('')
          .trim();

  const title = parseSingleTitleText(ctx, fullText);
  if (title) {
    ctx.update('title', title);
  }

  return title;
}
