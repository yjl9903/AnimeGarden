import type { ParseOptions, ParseResult } from './types.js';

import { Context } from './context.js';
import { tokenize } from './tokenizer/index.js';
import { parseMultipleTitles } from './title.js';
import { Fansub, parseFansub } from './fansub.js';
import { parseSuffixEpisodes } from './episodes.js';
import { parsePrefixTextTags, parsePrefixWrappedTags, parseSuffixWrappedTags } from './keyword.js';

const parsers: Record<string, (context: Context) => ParseResult | undefined> = {
  [Fansub.Kirara_Fantasia]: (ctx) => {
    // [黒ネズミたち] 關於我在無意間被隔壁的天使變成廢柴這件事 2 / Otonari no Tenshi-sama 2 - 01 (Baha 1920x1080 AVC AAC MP4)
    parseFansub(ctx);
    parseSuffixWrappedTags(ctx);
    parseSuffixEpisodes(ctx);
    parseMultipleTitles(ctx);
    return ctx.validate();
  },
  [Fansub.ANi]: (ctx) => {
    // [ANi] Classroom of the Elite S2 -  歡迎來到實力至上主義的教室 第二季 - 02 [1080P][Baha][WEB-DL][AAC AVC][CHT][MP4]
    // [ANi] Tasogare Out Focus /  黃昏光影 - 08 [1080P][Baha][WEB-DL][AAC AVC][CHT][MP4]
    parseFansub(ctx);
    parseSuffixWrappedTags(ctx);
    parseSuffixEpisodes(ctx);

    const titles = parseMultipleTitles(ctx);
    if (titles.length === 2) {
      ctx.update('title', titles[1]);
      ctx.update('titles', [titles[0]]);
    }

    return ctx.validate();
  },
  [Fansub.LoliHouse]: (ctx) => {
    parseFansub(ctx);
    parseSuffixWrappedTags(ctx);
    parseSuffixEpisodes(ctx);
    parseMultipleTitles(ctx);

    // Postprocess

    if (ctx.result.titles && ctx.result.episodeRange) {
      const title = ctx.result.titles.at(-1);
      if (title && title.endsWith(' -')) {
        ctx.result.titles[ctx.result.titles.length - 1] = title.slice(0, title.length - 2);
      }
    }

    // 在地下城寻求邂逅是否搞错了什么2 + season 2 -> 在地下城寻求邂逅是否搞错了什么
    if (ctx.result.title && ctx.result.season?.number) {
      const title = ctx.result.title;
      const season = ctx.result.season.number;
      if (
        title.length >= 2 &&
        +title[title.length - 1] === season &&
        !/\d/.test(title[title.length - 2])
      ) {
        ctx.result.title = ctx.result.title.slice(0, title.length - `${season}`.length);
      }
    }

    // [花语字幕组&LoliHouse][清恋][Seiren][07][WebRip 1920x1080 HEVC AAC][繁日外挂字幕] v2
    if (ctx.tags) {
      ctx.tags.filter((tag) => {
        const res = /^[vV](\d+)$/.exec(tag)?.[1];
        if (res) {
          ctx.update('version', +res);
          return false;
        } else {
          return true;
        }
      });
    }

    return ctx.validate();
  },
  [Fansub.绿茶字幕组]: (ctx) => {
    parseFansub(ctx);
    parseSuffixWrappedTags(ctx);
    parseSuffixEpisodes(ctx);
    parseMultipleTitles(ctx);
    return ctx.validate();
  }
};

export function parse(title: string, options: ParseOptions = {}): ParseResult | undefined {
  if (!title) return undefined;

  const tokens = tokenize(title);
  if (tokens.length === 0) return undefined;

  let fansub = options.fansub;

  const context = new Context(tokens, options);

  const parser = fansub ? parsers[fansub] : undefined;

  // Use pre-defined parser
  if (parser) {
    const result = parser(context);
    return result;
  }

  // Fallback to default parser

  // 1. Parse fansub
  parseFansub(context);
  if (!fansub) {
    fansub = context.result.fansub?.name;
  }
  if (!fansub) {
    return undefined;
  }

  if (parsers[fansub]) {
    // Re-run with parser
    return parse(title, { ...options, fansub });
  }

  // Parse left tags
  parsePrefixWrappedTags(context);
  parsePrefixTextTags(context);

  // 2. Parse right tags
  parseSuffixWrappedTags(context);
  parseSuffixEpisodes(context);

  // 3. Parse title
  const titles = parseMultipleTitles(context);
  if (titles.length === 0) {
    return undefined;
  }

  // 4. Postprocess
  const result = context.validate();

  return result;
}
