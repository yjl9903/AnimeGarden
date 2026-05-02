import type { Context } from './context.js';

import { parseSuffixTextInlineTags } from './keyword.js';
import { parseSuffixTextInlineSeason } from './episodes.js';

export function splitMultipleTitles(ctx: Context, separators = ['/', '-']) {
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
    const parts = fullText.split(` ${separator} `);
    const result: string[] = [];

    if (fullText.startsWith(separator) && parts.length > 0) {
      parts[0] += separator;
    }
    if (fullText.endsWith(separator) && parts.length > 0) {
      parts[parts.length - 1] += separator;
    }

    for (let i = 0; i < parts.length; i += 1) {
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

export function parseMultipleTitles(ctx: Context, separators = ['/', '-']) {
  const titles = splitMultipleTitles(ctx, separators);
  if (titles.length === 0) return [];

  const trimmedTitles = titles.map((t) => parseSingleTitleText(ctx, t));
  const trimmedTitle = trimmedTitles[0];

  ctx.update('title', trimmedTitle);

  const otherTitles = [...new Set(trimmedTitles)].filter((t) => t !== trimmedTitle);
  if (otherTitles.length > 0) {
    ctx.update('titles', otherTitles);
  }

  return [trimmedTitle, ...otherTitles];
}
