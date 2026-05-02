import type { Context } from './context.js';

import { Token, tokenize } from './tokenizer/index.js';
import { Types, matchEpiodes } from './episodes.js';

const AudioTerm = new Set([
  // Audio channels
  '2.0CH',
  '2CH',
  '5.1',
  '5.1CH',
  'DTS',
  'DTS-ES',
  'DTS5.1',
  'TRUEHD5.1',
  // Audio codec
  'AAC',
  'AACX2',
  'AAC×2',
  'AACX3',
  'AAC×3',
  'AACX4',
  'AAC×4',
  'AC3',
  'EAC3',
  'E-AC-3',
  'FLAC',
  'FLACX2',
  'FLAC×2',
  'FLACX3',
  'FLAC×3',
  'FLACX4',
  'FLAC×4',
  'LOSSLESS',
  'MP3',
  'WAV',
  'OGG',
  'VORBIS',
  // Audio language
  'DUALAUDIO',
  'DUAL AUDIO'
]);

const VideoTerm = new Set([
  // Frame rate
  '23.976FPS',
  '24FPS',
  '29.97FPS',
  '30FPS',
  '60FPS',
  '120FPS',
  // Video codec
  '8BIT',
  '8-BIT',
  '10BIT',
  '10BITS',
  '10-BIT',
  '10-BITS',
  'HI10',
  'HI10P',
  'HI444',
  'HI444P',
  'HI444PP',
  'H264',
  'H265',
  'H.264',
  'H.265',
  'X264',
  'X265',
  'X.264',
  'AVC',
  'HEVC',
  'HEVC2',
  'HEVC_OPUS',
  'HEVC-10BIT',
  'HEVC_10BIT',
  'HEVC-8BIT',
  'HEVC_8BIT',
  'DIVX',
  'DIVX5',
  'DIVX6',
  'XVID',
  // Video format
  'AVI',
  'RMVB',
  'WMV',
  'WMV3',
  'WMV9',
  // Video quality
  'HDR',
  'HQ',
  'LQ',
  // Video resolution
  'HD',
  'SD'
]);

const VideoResolution = new Set([
  '480P',
  '720P',
  '1080P',
  '2160P',
  'AI2160p',
  '1280X720',
  '1280×720',
  '1920X816',
  '1920×816',
  '1920X1080',
  '1920×1080',
  '2K',
  '4K'
]);

const Source = new Set([
  'BD',
  'BDRIP',
  'BLURAY',
  'BLU-RAY',
  'BDREMUX',
  'UHDBDRIP',
  'DVD',
  'DVD5',
  'DVD9',
  'DVD-R2J',
  'DVDRIP',
  'DVD-RIP',
  'R2DVD',
  'R2J',
  'R2JDVD',
  'R2JDVDRIP',
  'HDTV',
  'HDTVRIP',
  'TVRIP',
  'TV-RIP',
  'WEB',
  'WEBCAST',
  'WEBDL',
  'WEB-DL',
  'WEBRIP',
  'WEB-RIP',
  'WEB-MKV'
]);

const Platfroms = new Set(['Baha', 'Bilibili', 'B-Global', 'ABEMA', 'CR', 'ViuTV', 'AMZN', 'ADN']);

const Languages = new Set([
  'CN',
  'CHS',
  'CHT',
  'YUE',
  'JP',
  '简体',
  '国语中字',
  '繁體',
  '中日双语',
  '简日双语',
  '繁日雙語',
  'HOY粵語'
]);

const Subtitles = new Set([
  'ASS',
  'ASSX2',
  'GB',
  'BIG5',
  'DUB',
  'DUBBED',
  'HARDSUB',
  'HARDSUBS',
  'RAW',
  'SOFTSUB',
  'SOFTSUBS',
  'SUB',
  'SUBBED',
  'SUBTITLED',
  'SRT',
  'SRTX3'
]);

const Variants = new Set(['日配版', '中配版', '日文配音', '中文配音']);

const LanguagePrefixes = [
  '简体',
  '简日双语',
  '简日',
  '简繁日双语',
  '简繁日语',
  '简繁日',
  '简繁英',
  '简繁',
  '繁體',
  '繁体',
  '繁日',
  '繁英',
  '繁简日',
  '中日英',
  '英文'
];

const SubtitlesSufixes = new Set(['内嵌', '內嵌', '内封', '内封字幕', '外挂', '外掛', '外挂字幕']);

const PlatformLanguage = new Map([['ViuTV粵語', ['ViuTV', '粵語']]]);

const LanguageSubtitles = new Map([
  ['简体字幕', ['简体', undefined]],
  ['繁體字幕', ['繁體', undefined]],
  ['简日双语字幕', ['简日双语', undefined]],
  ['TVB粵語', ['粵語', undefined]],
  ['代理商粵語', ['粵語', undefined]],
  ['粵日雙語+內封繁體中文字幕', ['繁體中文', '內封字幕']],
  ['粵語+無對白字幕', [undefined, '無對白字幕']]
]);

const Extension = new Set([
  '3GP',
  'AVI',
  'DIVX',
  'FLV',
  'M2TS',
  'MKV',
  'MOV',
  'MP4',
  'MPG',
  'OGM',
  'RM',
  'RMVB',
  'TS',
  'WEBM',
  'WMV'
]);

const OtherTags = new Set([
  //
  '国漫',
  //
  '先行版',
  '先行版本',
  '正式版',
  '正式版本',
  //
  '年齡限制版',
  //
  'Ani-One',
  //
  '僅限港澳台',
  '僅限港澳台地區',
  '僅限港澳臺地區',
  //
  '重播',
  //
  'End',
  'Fin'
]);

// Prefix
const SearchPrefix = ['检索：', '检索用：'];
const HiringPrefix = ['招募', '字幕社招人', '字幕社招人內詳'];
const OtherPrefix = ['▶'];

export function matchSingleTag(ctx: Context, text: string) {
  const upper = text.toUpperCase();
  // Match keywords
  if (AudioTerm.has(upper)) {
    ctx.update3('file', 'audio', 'term', text);
    return true;
  }
  if (VideoTerm.has(upper)) {
    ctx.update3('file', 'video', 'term', text);
    return true;
  }
  if (VideoResolution.has(upper)) {
    ctx.update3('file', 'video', 'resolution', text);
    return true;
  }
  if (Source.has(upper)) {
    ctx.update('source', text);
    return true;
  }
  if (Platfroms.has(text)) {
    ctx.update('platform', text);
    return true;
  }
  if (Types.has(upper)) {
    ctx.update('type', text);
    return true;
  }
  if (Variants.has(upper)) {
    ctx.update('variant', text);
    return true;
  }
  if (Extension.has(upper)) {
    ctx.update2('file', 'extension', text);
    return true;
  }
  if (OtherTags.has(text)) {
    ctx.tags.push(text);
    return true;
  }

  // Match language and subtitles
  {
    if (Languages.has(upper)) {
      ctx.update('language', text);
      return true;
    }
    if (Subtitles.has(upper)) {
      if (!ctx.result.subtitles) {
        ctx.update('subtitles', text);
      }
      return true;
    }
    // Combine language and subtitles
    const combined = LanguageSubtitles.get(text);
    if (combined) {
      ctx.update('language', combined[0]);
      ctx.update('subtitles', combined[1]);
      return true;
    }
    const combined2 = PlatformLanguage.get(text);
    if (combined2) {
      ctx.update('platform', combined2[0]);
      ctx.update('language', combined2[1]);
      return true;
    }

    // Auto combined
    for (const prefix of LanguagePrefixes) {
      if (text.startsWith(prefix)) {
        const language = prefix;
        const subtitles = text.slice(prefix.length);
        if (SubtitlesSufixes.has(subtitles)) {
          ctx.update('language', language);
          ctx.update('subtitles', subtitles);
          return true;
        }
      }
    }
  }

  // Match regex
  {
    {
      // 2024年10月番
      const match = /^(\d\d\d\d)年(\d\d?)月新?番$/.exec(text);
      if (match) {
        const year = +match[1];
        const month = +match[2];
        if (1949 <= year && year <= 2099) {
          ctx.update('year', year);
        }
        if (1 <= month && month <= 12) {
          ctx.update('month', month);
        }
        return true;
      }
    }
    {
      // ★10月新番
      const match = /^★?(\d\d?)月新?番★?$/.exec(text);
      if (match) {
        const month = +match[1];
        if (1 <= month && month <= 12) {
          ctx.update('month', month);
        }
        return true;
      }
    }
    {
      // [2024.12.15]
      const match = /^(\d\d\d\d)\.(\d?\d)\.(\d?\d)$/.exec(text);
      if (match) {
        const year = +match[1];
        const month = +match[2];
        if (1949 <= year && year <= 2099) {
          ctx.update('year', year);
        }
        if (1 <= month && month <= 12) {
          ctx.update('month', month);
        }
        return true;
      }
    }
    {
      // [2024SP]
      const match = /^(\d\d\d\d)(SP)$/.exec(text);
      if (match) {
        const year = +match[1];
        const type = match[2];
        if (1949 <= year && year <= 2099) {
          ctx.update('year', year);
        }
        ctx.update('type', type);
        return true;
      }
    }
    {
      // v2
      const match = /^[vV](\d+)$/.exec(text);
      if (match) {
        const version = +match[1];
        ctx.update('version', version);
        return true;
      }
    }
  }

  // Match prefix
  {
    for (const prefix of SearchPrefix) {
      if (text.startsWith(prefix)) {
        const title = text.slice(prefix.length).trim();
        ctx.tags.push(title);
        return true;
      }
    }
    for (const prefix of HiringPrefix) {
      if (text.startsWith(prefix)) {
        return true;
      }
    }
    for (const prefix of OtherPrefix) {
      if (text.startsWith(prefix)) {
        ctx.tags.push(text);
        return true;
      }
    }
  }

  return false;
}

export function matchMultipleTags(ctx: Context, text: string, TagSeperators = [' ', '_']) {
  for (const sep of TagSeperators) {
    const parts = text.split(sep);
    if (parts.length <= 1) continue;
    let matched = true;
    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i];
      if (!matchSingleTag(ctx, part)) {
        matched = false;
      }
    }
    if (matched) {
      return true;
    }
  }
  return false;
}

function parseWrappedTag(ctx: Context, token: Token) {
  if (token.isWrapped) {
    const text = token.text;
    if (matchSingleTag(ctx, text)) {
      return true;
    }
    if (matchEpiodes(ctx, text)) {
      return true;
    }
    if (matchMultipleTags(ctx, text)) {
      return true;
    }
  }
  return false;
}

export function parsePrefixWrappedTags(ctx: Context) {
  while (ctx.left < ctx.right) {
    if (parseWrappedTag(ctx, ctx.tokens[ctx.left])) {
      ctx.left += 1;
    } else {
      break;
    }
  }
}

export function parseSuffixWrappedTags(ctx: Context) {
  while (ctx.left < ctx.right) {
    if (parseWrappedTag(ctx, ctx.tokens[ctx.right])) {
      ctx.right -= 1;
    } else {
      // Unknown tags
      if (ctx.left + 2 < ctx.right && ctx.right >= ctx.tokens.length - 1) {
        ctx.tags.push(ctx.tokens[ctx.right].text);
        ctx.right -= 1;
      } else {
        break;
      }
    }
  }
}

export function parsePrefixTextTags(ctx: Context) {
  if (ctx.left > ctx.right) return false;

  const token = ctx.tokens[ctx.left];
  const trimmed = parsePrefixTextInlineTags(ctx, token.text);

  if (trimmed !== token.text) {
    ctx.tokens[ctx.left] = new Token(trimmed, token.left, token.right);
    return true;
  }

  return false;
}

export function parsePrefixTextInlineTags(ctx: Context, text: string) {
  {
    // ★10月新番
    const match = /^★?(\d\d?)月新?番★?/.exec(text);
    if (match) {
      const matched = match[0];
      const month = +match[1];
      ctx.update('month', month);
      text = text.slice(matched.length);
    }
  }
  {
    // ★剧场版★
    const match = /^★?(剧场版|劇場版)★?/.exec(text);
    if (match) {
      const matched = match[0];
      const type = match[1];
      ctx.update('type', type);
      text = text.slice(matched.length);
    }
  }
  return text;
}

export function parseSuffixTextInlineTags(ctx: Context, text: string) {
  let changed = 0;

  const tokens = tokenize(text, false);

  while (tokens.length > 1) {
    const token = tokens[tokens.length - 1].trim();
    if (parseWrappedTag(ctx, token)) {
      changed += 1;
      tokens.pop();
    } else {
      break;
    }
  }

  if (changed) {
    return tokens.map((t) => t.toString()).join('');
  }

  return text;
}

/**
 * Handle inline space splitted tags:
 *
 * @example【極影字幕社】★10月新番 在地下城尋求邂逅是否搞錯了什麼 第五季 豐饒的女神篇 第06話 BIG5 1080P MP4（字幕社招人內詳）
 */
export function parseSuffixTextInlineMultipleTags(
  ctx: Context,
  text: string,
  separators = [' ', '★']
) {
  {
    for (const sep of separators) {
      const parts = text.split(sep);
      if (parts.length > 1) {
        let changed = 0;
        while (parts.length > 1) {
          const part = parts[parts.length - 1];
          // Skip single number
          if (/^\d+$/.test(part)) {
            break;
          }
          if (
            matchSingleTag(ctx, part) ||
            matchEpiodes(ctx, part) ||
            matchMultipleTags(ctx, part)
          ) {
            changed++;
            parts.pop();
          } else {
            break;
          }
        }
        if (changed > 1) {
          const trimmed = parts.join(sep);
          text = trimmed;
        }
        if (changed > 0) {
          break;
        }
      }
    }
  }
  return text;
}
