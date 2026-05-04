import type { Context } from './context.js';

import { FileExtensions } from './file.js';
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
  'EAC3&AAC',
  'AAC',
  'AACX2',
  'AAC×2',
  'AACX3',
  'AAC×3',
  'AACX4',
  'AAC×4',
  'QAAC',
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
  'FLAC/AC3', // TODO: split
  'LOSSLESS',
  'MP3',
  'WAV',
  'OGG',
  'VORBIS',
  // Audio language
  'DUALAUDIO',
  'DUAL AUDIO'
]);

// TODO: split codec and bitDepth
const VideoTerms = new Set([
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
  'AVC-8BIT',
  'HEVC',
  'HEVC2',
  'HEVC_OPUS',
  'HEVC-10BIT',
  'HEVC-10BIT-1440P', // TODO: split resolution
  'HEVC-10BIT-2160P', // TODO: split resolution
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

const VideoFrameRates = new Set(['23.976FPS', '24FPS', '29.97FPS', '30FPS', '60FPS', '120FPS']);

const VideoResolutions = new Set([
  '480P',
  '720P',
  '720P@60FPS', // TODO: use regexp
  '804P',
  '960P',
  '1080P',
  '1180P',
  '1080P@60FPS', // TODO: use regexp
  '1080P@96FPS', // TODO: use regexp
  '1080P高帧率', // TODO: handle
  '1920X816@60FPS', // TODO
  '1636P',
  '2160P',
  'AI2160p', // TODO: use regexp
  '854X480',
  '854×480',
  '948X720',
  '1280X720',
  '1280×720',
  '1920X804',
  '1920×804',
  '1920X816',
  '1920×816',
  '1920X818',
  '1920x818',
  '1920X820',
  '1920×820',
  '1920X1080',
  '1920×1080',
  '2048X852',
  '2048×852',
  '2538X1080',
  '2538×1080',
  '2600X1080',
  '2600×1080',
  '3840X2160',
  '3840×2160',
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
  'WEB-MKV',
  'MASTERRIP',
  'DISC1', // TODO: volume [雪飄工作室][アイカツプラネット！/Aikatsu_Planet!/偶像活動星球][BDrip][Disc1](檢索:偶活/愛活)
  'DISC2',
  'DISC3',
  'DISC4',
  'DISC5',
  'DISC6',
  'DISC7',
  'DISC8',
  'DISC9'
]);

const Platfroms = new Set([
  'Baha',
  'Bili',
  'Bilibili',
  'BiliBili',
  'B-Global',
  'ABEMA',
  'CR',
  'AT-X',
  'AT-X版',
  'ViuTV',
  'AMZN',
  'ADN',
  'Sentai',
  'Netflix',
  'NF'
]);

const Variants = new Set([
  '日配版',
  '中配版',
  '日文配音',
  '中文配音',
  'Chinese Audio',
  'Japanese Audio',
  'JPN Audio',
  'Japanese Dub',
  'JP Dub',
  'English Audio',
  'English Dub'
]);

const SubtitleFormats = new Set([
  'ASS',
  'ASSX2',
  'ASSX3',
  'ASSX4',
  'HARDSUB',
  'HARDSUBS',
  'SOFTSUB',
  'SOFTSUBS',
  'SUB',
  'SUBBED',
  'SUBTITLED',
  'SRT',
  'SRTX2',
  'SRTX3',
  'SRTX4'
]);

const SubtitleEncoding = new Set(['GB&BIG5', 'BIG5&GB', '外挂GB/BIG5', 'GB/BIG5', 'GB', 'BIG5']);

const PlatformLanguage = new Map([
  ['ViuTV粵語', ['ViuTV', '粵語']],
  ['TVB粵語', ['TVB', '粵語']]
]);

// TODO
const LanguageSubtitleFormats = new Map([
  ['代理商粵語', ['粵語', undefined]],
  ['粵日雙語+內封繁體中文字幕', ['繁體中文', '內封字幕']],
  ['粵語+無對白字幕', ['粵語+無對白', undefined]]
]);

const Languages = new Set([
  'CN',
  'CHS',
  'CHT',
  'YUE',
  'JPN',
  'JP',
  '简体',
  '简/繁·日',
  '繁/體',
  '简繁',
  '国语中字',
  '繁體',
  '中日双语',
  '繁日双语',
  '简日双语',
  '繁日雙語',
  'HOY粵語',
  '外挂CHS/CHT', // TODO: 处理 倒序
  '外挂繁简日字幕' // TODO: 处理 倒序
]);

const LanguagePrefixes = [
  '简体',
  '简日双语',
  '简日',
  '简繁日双语',
  '简繁日语',
  '简繁日',
  '简繁英日',
  '简繁日英',
  '简繁英',
  '简繁泰',
  '简/繁',
  '简繁',
  '簡繁',
  '简英',
  '简',
  '繁體',
  '繁体',
  '繁日',
  '繁英',
  '繁简日',
  '繁',
  '中日英',
  '英文',
  '英'
];

const SubtitleFormatSuffixes = new Set([
  '内嵌字幕',
  '内嵌',
  '內嵌',
  '内封字幕',
  '内封',
  '內封',
  '外挂字幕',
  '外挂',
  '外掛',
  '内挂',
  '字幕'
]);

const OtherTags = new Set([
  //
  'RAW',
  'DUB',
  'DUBBED',
  'retake',
  'SNS',
  //
  '全歌曲特效',
  '无水印',
  '含副音轨',
  '特典',
  'LIVE纯享',
  '无损重制',
  '广播剧_Dream☆Arch', // TODO: no hardcode
  //
  '国漫',
  'Donghua',
  //
  '特別版',
  '先行版',
  '先行版本',
  '正片先行版',
  '正式版',
  '正式版本',
  '放送版',
  '修订版',
  'On-air version',
  //
  '年齡限制版',
  //
  'Ani-One',
  //
  '僅限港澳台',
  '僅限港澳台地區',
  '僅限港澳臺地區',
  '仅限港澳台',
  '仅限港澳台地区',
  //
  '重播',
  //
  'End',
  'END',
  'TV + Movie Fin',
  'FIN',
  'Fin'
]);

// Prefix
const SearchPrefix = [
  '检索:',
  '检索：',
  '檢索:',
  '檢索：',
  '检索用:',
  '检索用：',
  '檢索用:',
  '檢索用：'
];

const HiringPrefix = ['招募', '急募', '字幕社招人', '字幕社招人'];

const OtherPrefix = ['▶'];

const Ignores = new Set(['务必查看bt站简介', '请看bt站简介', '添加日语', '添加日語']);

export function matchSingleTag(ctx: Context, text: string) {
  text = text.trim();

  const upper = text.toUpperCase();

  // Match keywords
  if (AudioTerm.has(upper)) {
    ctx.update3('file', 'audio', 'term', text);
    return true;
  }
  if (VideoTerms.has(upper)) {
    ctx.update3('file', 'video', 'term', text);
    return true;
  }
  if (VideoFrameRates.has(upper)) {
    ctx.update3('file', 'video', 'fps', text);
    return true;
  }
  if (VideoResolutions.has(upper)) {
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
  if (Variants.has(text)) {
    const variants = [...(ctx.result.variants ?? []), text];
    ctx.update('variants', variants);
    return true;
  }
  if (FileExtensions.has(upper)) {
    ctx.update2('file', 'extension', text);
    return true;
  }
  if (OtherTags.has(text)) {
    ctx.tags.push(text.trim());
    return true;
  }
  if (text.endsWith('.ver')) {
    ctx.tags.push(text.trim());
    return true;
  }
  if (text.startsWith('Bloomy_Cafe')) {
    ctx.tags.push(text.trim());
    return true;
  }
  if (Ignores.has(text)) {
    return true;
  }

  // tmdbid=1406607
  {
    const res = /^tmdbid=(.+)$/.exec(text);
    if (res) {
      ctx.update('tmdbId', res[1]);
      return true;
    }
  }

  // 抚物语 ...
  {
    const res = /^.+(物语|物語)$/.exec(text);
    if (res) {
      ctx.tags.push(text);
      return true;
    }
  }

  // Match language and subtitles
  {
    const languages = [...(ctx.result.subtitle?.languages ?? [])];

    if (Languages.has(upper)) {
      languages.push(text);
      ctx.update2('subtitle', 'languages', languages);
      return true;
    }
    if (SubtitleFormats.has(upper)) {
      if (!ctx.result.subtitle?.format) {
        ctx.update2('subtitle', 'format', text);
      }
      return true;
    }
    if (SubtitleEncoding.has(upper)) {
      if (!ctx.result.subtitle?.encoding) {
        ctx.update2('subtitle', 'encoding', text);
      }
      return true;
    }

    // Combine language and subtitles
    const combined = LanguageSubtitleFormats.get(text);
    if (combined) {
      if (combined[0]) {
        languages.push(combined[0]);
        ctx.update2('subtitle', 'languages', languages);
      }
      if (combined[1] && !ctx.result.subtitle?.format) {
        ctx.update2('subtitle', 'format', combined[1]);
      }
      return true;
    }

    const combined2 = PlatformLanguage.get(text);
    if (combined2) {
      ctx.update('platform', combined2[0]);
      languages.push(combined2[1]);
      ctx.update2('subtitle', 'languages', languages);
      return true;
    }

    // Auto combined
    for (const prefix of LanguagePrefixes) {
      if (text.startsWith(prefix)) {
        const language = prefix;
        const format = text.slice(prefix.length);
        if (SubtitleFormatSuffixes.has(format) || format === '') {
          languages.push(language);
          ctx.update2('subtitle', 'languages', languages);

          if (format && format !== '字幕' && !ctx.result.subtitle?.format) {
            ctx.update2('subtitle', 'format', format);
          }
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
      // ★10月新番 ★04月新番★
      const match = /^★?(\d{1,2})月新?番★?$/.exec(text);
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
        ctx.update(
          'search',
          title
            .split('/')
            .map((t) => t.trim())
            .filter(Boolean)
        );
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
        ctx.tags.push(text.trim());
        return true;
      }
    }
  }

  // Match vol.1
  {
    const res = /^(?:Vol|vol|Volume|volume)\.?\s*(?<vol>\d+)$/.exec(text);
    if (res) {
      const vol = res.groups?.vol ? +res.groups.vol : NaN;
      if (!Number.isNaN(vol)) {
        ctx.update2('volume', 'number', vol);
        return true;
      }
    }
  }

  return false;
}

export function matchMultipleTags(
  ctx: Context,
  text: string,
  TagSeperators = [' ', '_', '&', '+']
) {
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
    } else if (ctx.tokens[ctx.left].trim().toString() === '') {
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
    } else if (ctx.tokens[ctx.right].trim().toString() === '') {
      ctx.right -= 1;
    } else {
      // Unknown tags
      const isIgnoreLast = () => {
        const token = ctx.tokens[ctx.tokens.length - 1];
        if (SearchPrefix.some((prefix) => token.text.startsWith(prefix))) {
          return true;
        }
        if (HiringPrefix.some((prefix) => token.text.startsWith(prefix))) {
          return true;
        }
        if (Ignores.has(token.text)) {
          return true;
        }
        return false;
      };

      if (
        // xxx [未知标签]
        (ctx.left + 2 < ctx.right && ctx.right === ctx.tokens.length - 1) ||
        // xxx [未知标签](检索用)
        (ctx.right === ctx.tokens.length - 2 && isIgnoreLast())
      ) {
        ctx.tags.push(ctx.tokens[ctx.right].text.trim());
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
    if (trimmed) {
      ctx.tokens[ctx.left] = new Token(trimmed, token.left, token.right);
    } else {
      ctx.left += 1;
    }
    return true;
  }

  return false;
}

export function parsePrefixTextInlineTags(ctx: Context, text: string) {
  text = text.trim();
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
  {
    // ★老番★
    const match = /^★?(老番)★?/.exec(text);
    if (match) {
      const matched = match[0];
      // const type = match[1];
      text = text.slice(matched.length);
    }
  }
  return text;
}

export function parseSuffixTextInlineTags(ctx: Context, text: string) {
  let changed = 0;

  const tokens = tokenize(text);

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
  text = text.trim();
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
