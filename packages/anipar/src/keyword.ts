import type { Context } from './context.js';
import type { FileInfo } from './types.js';

import { FileExtensions } from './file.js';
import { Token, tokenize } from './tokenizer/index.js';
import { Types, matchEpiodes } from './episodes.js';

// MARK: audio / video

type AudioInfo = NonNullable<FileInfo['audio']>;

type VideoInfo = NonNullable<FileInfo['video']>;

const AudioChannels = new Set(['2.0CH', '2CH', '5.1', '5.1CH']);

const AudioCompoundTerms = new Map<string, AudioInfo>([
  ['DTS5.1', { codec: 'DTS', channels: '5.1' }],
  ['TRUEHD5.1', { codec: 'TRUEHD', channels: '5.1' }],
  ['AACX2', { codec: 'AAC', trackCount: 2 }],
  ['AAC×2', { codec: 'AAC', trackCount: 2 }],
  ['AACX3', { codec: 'AAC', trackCount: 3 }],
  ['AAC×3', { codec: 'AAC', trackCount: 3 }],
  ['AACX4', { codec: 'AAC', trackCount: 4 }],
  ['AAC×4', { codec: 'AAC', trackCount: 4 }],
  ['FLACX2', { codec: 'FLAC', trackCount: 2 }],
  ['FLAC×2', { codec: 'FLAC', trackCount: 2 }],
  ['FLACX3', { codec: 'FLAC', trackCount: 3 }],
  ['FLAC×3', { codec: 'FLAC', trackCount: 3 }],
  ['FLACX4', { codec: 'FLAC', trackCount: 4 }],
  ['FLAC×4', { codec: 'FLAC', trackCount: 4 }]
]);

const AudioCodecs = new Set([
  'DTS',
  'DTS-ES',
  'EAC3&AAC',
  'AAC',
  'QAAC',
  'AC3',
  'EAC3',
  'E-AC-3',
  'FLAC',
  'FLAC/AC3', // TODO: split
  'LOSSLESS',
  'MP3',
  'WAV',
  'OGG',
  'VORBIS',
  'OPUS'
]);

const AudioLanguages = new Set(['DUALAUDIO', 'DUAL AUDIO']);

const VideoBitDepths = new Set(['8BIT', '8-BIT', '10BIT', '10BITS', '10-BIT', '10-BITS']);

const VideoCodecs = new Set([
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
  'DIVX',
  'DIVX5',
  'DIVX6',
  'XVID'
]);

const VideoFormats = new Set(['AVI', 'RMVB', 'WMV', 'WMV3', 'WMV9']);

const VideoQualities = new Set(['HDR', 'HQ', 'LQ']);

const VideoResolutionTerms = new Set(['HD', 'SD']);

const VideoCompoundTerms = new Map<string, VideoInfo & { audioCodec?: string }>([
  ['AVC-8BIT', { codec: 'AVC', bitDepth: '8BIT' }],
  ['HEVC_OPUS', { codec: 'HEVC', audioCodec: 'OPUS' }],
  ['HEVC-10BIT', { codec: 'HEVC', bitDepth: '10BIT' }],
  ['HEVC-10BIT-1440P', { codec: 'HEVC', bitDepth: '10BIT', resolution: '1440P' }],
  ['HEVC-10BIT-2160P', { codec: 'HEVC', bitDepth: '10BIT', resolution: '2160P' }],
  ['HEVC_10BIT', { codec: 'HEVC', bitDepth: '10BIT' }],
  ['HEVC-8BIT', { codec: 'HEVC', bitDepth: '8BIT' }],
  ['HEVC_8BIT', { codec: 'HEVC', bitDepth: '8BIT' }]
]);

const VideoFrameRates = new Set(['23.976FPS', '24FPS', '29.97FPS', '30FPS', '60FPS', '120FPS']);

const VideoResolutions = new Set(['2K', '4K']);

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

// MARK: 语言,字幕等

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

const SubtitleFormatTerms = new Map([
  ['ASS', 'ASS'],
  ['ASSX2', 'ASSx2'],
  ['ASSX3', 'ASSx3'],
  ['ASSX4', 'ASSx4'],
  ['HARDSUB', 'HARDSUB'],
  ['HARDSUBS', 'HARDSUB'],
  ['SOFTSUB', 'SOFTSUB'],
  ['SOFTSUBS', 'SOFTSUB'],
  ['SUB', 'SUB'],
  ['SUBBED', 'SUB'],
  ['SUBTITLED', 'SUB'],
  ['SRT', 'SRT'],
  ['SRTX2', 'SRTx2'],
  ['SRTX3', 'SRTx3'],
  ['SRTX4', 'SRTx4']
]);

const SubtitleEncodingTerms = new Map<
  string,
  { format?: string; encoding?: string; encodings?: string[] }
>([
  ['GB&BIG5', { encodings: ['GB', 'BIG5'] }],
  ['BIG5&GB', { encodings: ['BIG5', 'GB'] }],
  ['外挂GB/BIG5', { format: '外挂', encodings: ['GB', 'BIG5'] }],
  ['GB/BIG5', { encodings: ['GB', 'BIG5'] }],
  ['GB', { encoding: 'GB' }],
  ['BIG5', { encoding: 'BIG5' }]
]);

const PlatformLanguageTerms = new Map([
  ['ViuTV粵語', ['ViuTV', '粵語']],
  ['TVB粵語', ['TVB', '粵語']]
]);

const LanguageSubtitleFormatTerms = new Map<string, { language: string; format?: string }>([
  ['代理商粵語', { language: '粵語' }],
  ['粵日雙語+內封繁體中文字幕', { language: '繁體中文', format: '內封字幕' }],
  ['粵語+無對白字幕', { language: '粵語+無對白' }]
]);

const SubtitleLanguageTerms = new Map([
  ['CN', 'CN'],
  ['CHS', 'CHS'],
  ['CHT', 'CHT'],
  ['YUE', 'YUE'],
  ['JPN', 'JPN'],
  ['JP', 'JP'],
  ['简体', '简体'],
  ['简/繁·日', '简/繁·日'],
  ['繁/體', '繁/體'],
  ['简繁', '简繁'],
  ['国语中字', '国语中字'],
  ['繁體', '繁體'],
  ['中日双语', '中日双语'],
  ['繁日双语', '繁日双语'],
  ['简日双语', '简日双语'],
  ['繁日雙語', '繁日雙語'],
  ['HOY粵語', 'HOY粵語'],
  ['外挂CHS/CHT', 'CHS/CHT'],
  ['外挂繁简日字幕', '繁简日']
]);

const SubtitleLanguagePrefixes = [
  '简繁日双语',
  '简繁日语',
  '简繁英日',
  '简繁日英',
  '简繁日',
  '简日双语',
  '简/繁',
  '简繁英',
  '简繁泰',
  '繁简日',
  '中日英',
  '简日',
  '简繁',
  '簡繁',
  '简英',
  '繁體',
  '繁体',
  '繁日',
  '繁英',
  '英文',
  '简体',
  '简',
  '繁',
  '英'
];

const SubtitleFormatSuffixTerms = new Map([
  ['内嵌字幕', '内嵌字幕'],
  ['内嵌', '内嵌'],
  ['內嵌', '內嵌'],
  ['内封字幕', '内封字幕'],
  ['内封', '内封'],
  ['內封', '內封'],
  ['外挂字幕', '外挂字幕'],
  ['外挂', '外挂'],
  ['外掛', '外掛'],
  ['内挂', '内挂'],
  ['字幕', undefined]
]);

// MARK; 其他标签

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
  '修訂版',
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

// MARK: 解析逻辑

export function matchSingleTag(ctx: Context, text: string) {
  text = text.trim();

  const upper = text.toUpperCase();

  // Match keywords
  {
    const info = AudioCompoundTerms.get(upper);
    if (info) {
      if (info.codec) {
        ctx.update3('file', 'audio', 'codec', info.codec);
      }
      if (info.channels) {
        ctx.update3('file', 'audio', 'channels', info.channels);
      }
      if (info.trackCount) {
        ctx.update3('file', 'audio', 'trackCount', info.trackCount);
      }
      return true;
    }
  }
  if (AudioChannels.has(upper)) {
    ctx.update3('file', 'audio', 'channels', text);
    return true;
  }
  if (AudioCodecs.has(upper)) {
    ctx.update3('file', 'audio', 'codec', text);
    return true;
  }
  if (AudioLanguages.has(upper)) {
    ctx.update3('file', 'audio', 'language', text);
    return true;
  }
  {
    const info = VideoCompoundTerms.get(upper);
    if (info) {
      if (info.codec) {
        ctx.update3('file', 'video', 'codec', info.codec);
      }
      if (info.bitDepth) {
        ctx.update3('file', 'video', 'bitDepth', info.bitDepth);
      }
      if (info.resolution) {
        ctx.update3('file', 'video', 'resolution', info.resolution);
      }
      if (info.audioCodec) {
        ctx.update3('file', 'audio', 'codec', info.audioCodec);
      }
      return true;
    }
  }
  if (VideoCodecs.has(upper)) {
    ctx.update3('file', 'video', 'codec', text);
    return true;
  }
  if (VideoBitDepths.has(upper)) {
    ctx.update3('file', 'video', 'bitDepth', text);
    return true;
  }
  if (VideoFormats.has(upper)) {
    ctx.update3('file', 'video', 'format', text);
    return true;
  }
  if (VideoQualities.has(upper)) {
    ctx.update3('file', 'video', 'quality', text);
    return true;
  }
  if (VideoResolutionTerms.has(upper)) {
    ctx.update3('file', 'video', 'resolution', text);
    return true;
  }
  if (VideoFrameRates.has(upper)) {
    ctx.update3('file', 'video', 'fps', text);
    return true;
  }
  {
    const res = /^(AI)(\d{3,4}[Pp])$/i.exec(text);
    if (res) {
      ctx.update3('file', 'video', 'enhancement', res[1]);
      ctx.update3('file', 'video', 'resolution', res[2]);
      return true;
    }
  }
  {
    const res = /^(\d{3,5}(?:[Pp]|[Xx×]\d{3,5}))@(\d+(?:\.\d+)?FPS)$/i.exec(text);
    if (res) {
      ctx.update3('file', 'video', 'resolution', res[1]);
      ctx.update3('file', 'video', 'fps', res[2]);
      return true;
    }
  }
  {
    const res = /^(\d{3,4}P)(高帧率)$/i.exec(text);
    if (res) {
      ctx.update3('file', 'video', 'resolution', res[1]);
      ctx.update3('file', 'video', 'frameRateMode', res[2]);
      return true;
    }
  }
  if (/^\d{3,4}P$/i.test(text) || /^\d{3,5}[Xx×]\d{3,5}$/.test(text)) {
    ctx.update3('file', 'video', 'resolution', text);
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
    const appendSubtitleLanguage = (language: string) => {
      const languages = [...(ctx.result.subtitle?.languages ?? []), language];
      ctx.update2('subtitle', 'languages', languages);
    };

    const updateSubtitleFormat = (format: string | undefined, overwrite = false) => {
      if (format && (overwrite || !ctx.result.subtitle?.format)) {
        ctx.update2('subtitle', 'format', format);
      }
    };

    const updateSubtitleEncoding = (encoding: string | undefined) => {
      if (encoding && !ctx.result.subtitle?.encoding && !ctx.result.subtitle?.encodings) {
        ctx.update2('subtitle', 'encoding', encoding);
      }
    };

    const updateSubtitleEncodings = (encodings: string[] | undefined) => {
      if (!encodings) {
        return;
      }
      const values = [...(ctx.result.subtitle?.encodings ?? []), ...encodings];
      ctx.update2('subtitle', 'encodings', values);
      if (ctx.result.subtitle?.encoding) {
        delete ctx.result.subtitle.encoding;
      }
    };

    const language = SubtitleLanguageTerms.get(upper) ?? SubtitleLanguageTerms.get(text);
    if (language) {
      appendSubtitleLanguage(language);
      return true;
    }

    const format = SubtitleFormatTerms.get(upper);
    if (format) {
      updateSubtitleFormat(format);
      return true;
    }

    const encodingInfo = SubtitleEncodingTerms.get(upper) ?? SubtitleEncodingTerms.get(text);
    if (encodingInfo) {
      updateSubtitleFormat(encodingInfo.format, true);
      updateSubtitleEncoding(encodingInfo.encoding);
      updateSubtitleEncodings(encodingInfo.encodings);
      return true;
    }

    const languageWithFormat = LanguageSubtitleFormatTerms.get(text);
    if (languageWithFormat) {
      appendSubtitleLanguage(languageWithFormat.language);
      updateSubtitleFormat(languageWithFormat.format);
      return true;
    }

    const platformLanguage = PlatformLanguageTerms.get(text);
    if (platformLanguage) {
      const [platform, language] = platformLanguage;
      ctx.update('platform', platform);
      appendSubtitleLanguage(language);
      return true;
    }

    for (const prefix of SubtitleLanguagePrefixes) {
      if (text.startsWith(prefix)) {
        const suffix = text.slice(prefix.length);
        if (suffix === '' || SubtitleFormatSuffixTerms.has(suffix)) {
          appendSubtitleLanguage(prefix);
          updateSubtitleFormat(SubtitleFormatSuffixTerms.get(suffix));
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
