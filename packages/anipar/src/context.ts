import type { FileInfo, ParseOptions, ParseResult } from './types.js';

import { Token } from './tokenizer/index.js';

// MARK: 上下文
export class Context {
  // Left cursor for consumed tokens (inclusive)
  public left = 0;

  // Right cursor for consumed tokens (inclusive)
  public right;

  public tokens: Token[];

  public options: ParseOptions;

  public result: Partial<ParseResult>;

  public tags: string[];

  public constructor(tokens: Token[], options: ParseOptions) {
    this.tokens = tokens;
    this.options = options;
    this.right = tokens.length - 1;
    this.tags = [];
    this.result = {};
    if (options.fansub) {
      this.result.fansub = { name: options.fansub };
    }
  }

  public update<K1 extends keyof ParseResult>(key: K1, value: ParseResult[K1]) {
    this.result[key] = value;
  }

  public update2<
    K1 extends keyof Required<ParseResult>,
    K2 extends keyof Required<ParseResult>[K1]
  >(key1: K1, key2: K2, value: Required<ParseResult>[K1][K2]) {
    if (!this.result[key1]) {
      // @ts-expect-error
      this.result[key1] = {};
    }
    // @ts-expect-error
    this.result[key1][key2] = value;
  }

  public update3<
    K1 extends keyof Required<ParseResult>,
    K2 extends keyof Required<ParseResult>[K1],
    K3 extends keyof Required<Required<ParseResult>[K1]>[K2]
  >(key1: K1, key2: K2, key3: K3, value: Required<Required<ParseResult>[K1]>[K2][K3]) {
    if (!this.result[key1]) {
      // @ts-expect-error
      this.result[key1] = {};
    }
    // @ts-expect-error
    if (!this.result[key1][key2]) {
      // @ts-expect-error
      this.result[key1][key2] = {};
    }
    // @ts-expect-error
    this.result[key1][key2][key3] = value;
  }

  public get hasEpisode() {
    return this.result.episode || this.result.episodes || this.result.episodesRange;
  }

  public normalize(): ParseResult | undefined {
    if (this.tags.length > 0) {
      this.result.tags = [...new Set([...(this.result.tags ?? []), ...this.tags])];
    }

    if (this.result.subtitle?.languages) {
      const languages = this.result.subtitle?.languages;
      this.result.subtitle.languages = normalizeLanguages(languages);
    }

    if (this.result.subtitle?.format) {
      this.result.subtitle.format = normalizeSubtitleFormat(this.result.subtitle.format);
    }

    if (this.result.subtitle?.encoding) {
      this.result.subtitle.encoding = normalizeSubtitleEncoding(this.result.subtitle.encoding);
    }

    if (this.result.subtitle?.encodings) {
      this.result.subtitle.encodings = normalizeSubtitleEncodings(this.result.subtitle.encodings);
    }

    if (this.result.file) {
      normalizeFileInfo(this.result.file);
    }

    if (this.result.variants) {
      this.result.variants = [...new Set(this.result.variants)];
    }

    if (this.result.title && this.result.title.length > 0) {
      return this.result as ParseResult;
    }

    return undefined;
  }
}

// MARK: 字幕类型归一化

function normalizeSubtitleFormat(format: string): string {
  const trimmed = format.trim();
  const upper = normalizeUpperTag(trimmed);

  // 字幕类型使用简体中文的常用发布术语；ASS/SRT 是字幕格式名，保留标准大写。
  //
  // @example "HARDSUB" -> "内嵌字幕"
  // @example "SOFTSUB" -> "软字幕"
  // @example "內封字幕" -> "内封字幕"
  // @example "SRTx2" -> "SRT字幕×2"
  {
    const res = /^(ASS|SRT)(?:[Xx×](\d+))?$/i.exec(trimmed);
    if (res) {
      return res[2] ? `${res[1].toUpperCase()}字幕×${res[2]}` : `${res[1].toUpperCase()}字幕`;
    }
  }

  if (/^HARDSUBS?$/.test(upper) || /^(内嵌|內嵌)(字幕)?$/.test(trimmed)) {
    return '内嵌字幕';
  }

  if (/^SOFTSUBS?$/.test(upper)) {
    return '软字幕';
  }

  if (/^(内封|內封)(字幕)?$/.test(trimmed)) {
    return '内封字幕';
  }

  if (/^(外挂|外掛)(字幕)?$/.test(trimmed)) {
    return '外挂字幕';
  }

  if (/^(内挂|內掛)(字幕)?$/.test(trimmed)) {
    return '内挂字幕';
  }

  if (/^(SUB|SUBBED|SUBTITLED)$/.test(upper) || trimmed === '字幕') {
    return '字幕';
  }

  return trimmed.replaceAll('內', '内').replaceAll('掛', '挂');
}

function normalizeSubtitleEncoding(encoding: string): string {
  const upper = normalizeUpperTag(encoding);

  // Keep release-scene shorthand instead of expanding to a specific code page,
  // because "GB" may mean GB2312, GBK, or a broader simplified Chinese package.
  //
  // @example "gb" -> "GB"
  // @example "big5" -> "BIG5"
  if (upper === 'GB' || upper === 'BIG5') {
    return upper;
  }

  return upper;
}

function normalizeSubtitleEncodings(encodings: string[]): string[] {
  const normalized = new Set(encodings.map(normalizeSubtitleEncoding));
  const order = ['GB', 'BIG5'];

  // Multi-encoding subtitle packages use a stable canonical order in snapshots
  // and API output, regardless of source order such as "BIG5&GB".
  //
  // @example ["BIG5", "GB"] -> ["GB", "BIG5"]
  // @example ["GB", "BIG5", "GB"] -> ["GB", "BIG5"]
  return [
    ...order.filter((encoding) => normalized.delete(encoding)),
    ...encodings.map(normalizeSubtitleEncoding).filter((encoding) => normalized.delete(encoding))
  ];
}

// MARK: 媒体信息归一化

function normalizeFileInfo(file: FileInfo) {
  if (file.audio) {
    normalizeAudioInfo(file.audio);
  }

  if (file.video) {
    normalizeVideoInfo(file.video);
  }
}

function normalizeAudioInfo(audio: NonNullable<FileInfo['audio']>) {
  if (audio.channels) {
    audio.channels = normalizeAudioChannels(audio.channels);
  }

  if (audio.codec) {
    audio.codec = normalizeAudioCodec(audio.codec);
  }

  if (audio.language) {
    audio.language = normalizeAudioLanguage(audio.language);
  }
}

function normalizeVideoInfo(video: NonNullable<FileInfo['video']>) {
  if (video.bitDepth) {
    video.bitDepth = normalizeBitDepth(video.bitDepth);
  }

  if (video.codec) {
    video.codec = normalizeVideoCodec(video.codec);
  }

  if (video.enhancement) {
    video.enhancement = normalizeUpperTag(video.enhancement);
  }

  if (video.format) {
    video.format = normalizeUpperTag(video.format);
  }

  if (video.fps) {
    video.fps = normalizeFrameRate(video.fps);
  }

  if (video.quality) {
    video.quality = normalizeUpperTag(video.quality);
  }

  if (video.resolution) {
    video.resolution = normalizeVideoResolution(video.resolution);
  }
}

function normalizeUpperTag(value: string): string {
  return value.trim().toUpperCase();
}

function normalizeLowerTag(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeAudioCodec(codec: string): string {
  const upper = normalizeUpperTag(codec);

  // Audio codecs follow their common published names. Acronyms stay uppercase,
  // product-style names keep their usual casing, and descriptive tags use lowercase.
  //
  // @example "EAC3" -> "E-AC-3"
  // @example "OPUS" -> "Opus"
  // @example "QAAC" -> "qaac"
  const codecs = new Map([
    ['AAC', 'AAC'],
    ['AC3', 'AC-3'],
    ['AC-3', 'AC-3'],
    ['DTS', 'DTS'],
    ['DTS-ES', 'DTS-ES'],
    ['EAC3', 'E-AC-3'],
    ['E-AC-3', 'E-AC-3'],
    ['EAC3&AAC', 'E-AC-3+AAC'],
    ['FLAC', 'FLAC'],
    ['FLAC/AC3', 'FLAC+AC-3'],
    ['LOSSLESS', 'lossless'],
    ['MP3', 'MP3'],
    ['OGG', 'Ogg'],
    ['OPUS', 'Opus'],
    ['QAAC', 'qaac'],
    ['TRUEHD', 'TrueHD'],
    ['VORBIS', 'Vorbis'],
    ['WAV', 'WAV']
  ]);

  return codecs.get(upper) ?? normalizeLowerTag(codec);
}

function normalizeVideoCodec(codec: string): string {
  const upper = normalizeUpperTag(codec);

  // Video codecs are normalized to widely used codec-family names from release
  // metadata and media specs.
  //
  // @example "H.264" -> "AVC"
  // @example "x265" -> "HEVC"
  // @example "DIVX5" -> "DivX"
  if (/^(H\.?264|X\.?264|AVC)$/.test(upper)) {
    return 'AVC';
  }
  if (/^(H\.?265|X\.?265|HEVC2?|HVC1)$/.test(upper)) {
    return 'HEVC';
  }
  if (/^DIVX\d*$/.test(upper)) {
    return 'DivX';
  }
  if (upper === 'XVID') {
    return 'Xvid';
  }
  if (/^HI10P?$/.test(upper)) {
    return 'Hi10P';
  }
  if (/^HI444P*$/.test(upper)) {
    return upper.replace('HI', 'Hi');
  }

  return normalizeLowerTag(codec);
}

function normalizeAudioChannels(channels: string): string {
  const upper = normalizeUpperTag(channels);

  // Channel layouts are represented without the optional "ch" suffix because
  // "2.0" and "5.1" are the common layout names in media tooling.
  //
  // @example "2CH" -> "2.0"
  // @example "5.1CH" -> "5.1"
  if (upper === '2CH') {
    return '2.0';
  }
  if (upper === '5.1CH') {
    return '5.1';
  }

  return upper.replace(/CH$/, '');
}

function normalizeAudioLanguage(language: string): string {
  const upper = normalizeUpperTag(language);

  // No formal casing exists for this marker, so use lowercase words.
  //
  // @example "DUALAUDIO" -> "dual audio"
  // @example "DUAL AUDIO" -> "dual audio"
  if (upper === 'DUALAUDIO' || upper === 'DUAL AUDIO') {
    return 'dual audio';
  }

  return normalizeLowerTag(language);
}

function normalizeBitDepth(bitDepth: string): string {
  const upper = normalizeUpperTag(bitDepth);
  const res = /^(\d+)[-_ ]?BITS?$/.exec(upper);

  // Bit depth is conventionally hyphenated in technical copy.
  //
  // @example "10BIT" -> "10-bit"
  // @example "8 bits" -> "8-bit"
  if (res) {
    return `${res[1]}-bit`;
  }

  return normalizeLowerTag(bitDepth);
}

function normalizeFrameRate(fps: string): string {
  const upper = normalizeUpperTag(fps);
  const res = /^(\d+(?:\.\d+)?)\s*FPS$/.exec(upper);

  // "fps" is a unit-like abbreviation in this schema, so use lowercase.
  //
  // @example "23.976FPS" -> "23.976fps"
  // @example "60 fps" -> "60fps"
  return res ? `${res[1]}fps` : normalizeLowerTag(fps);
}

function normalizeVideoResolution(resolution: string): string {
  const trimmed = resolution.trim();
  const upper = trimmed.toUpperCase();

  // P-height resolutions keep the conventional lowercase "p".
  //
  // @example "1080P" -> "1080p"
  // @example "2160p" -> "2160p"
  {
    const res = /^(\d{3,4})P$/i.exec(trimmed);
    if (res) {
      return `${res[1]}p`;
    }
  }

  // Pixel dimensions use a lowercase "x" regardless of source separator.
  //
  // @example "1920X1080" -> "1920x1080"
  // @example "3840×2160" -> "3840x2160"
  {
    const res = /^(\d{3,5})[Xx×](\d{3,5})$/.exec(trimmed);
    if (res) {
      return `${res[1]}x${res[2]}`;
    }
  }

  if (/^\d+K$/.test(upper)) {
    return upper;
  }

  return trimmed;
}

// MARK: 字幕语言归一化

const NormalizedLanguages = ['简', '繁', '粤', '日', '英', '泰'] as const;

function normalizeLanguage(language: string): string[] | undefined {
  const trimmed = language.trim();
  const upper = trimmed.toUpperCase();

  if (/^(CN|CHINESE|ZH|中|中文|中字|国语中字|國語中字)$/.test(upper)) {
    return undefined;
  }

  const languages: string[] = [];
  const matches = {
    简: /(^|[^A-Z])CHS($|[^A-Z])|ZH[-_]?HANS|简|簡|简体|簡體|简中|簡中/i.test(trimmed),
    繁: /(^|[^A-Z])CHT($|[^A-Z])|ZH[-_]?HANT|繁|繁体|繁體|繁中|BIG5/i.test(trimmed),
    粤: /(^|[^A-Z])YUE($|[^A-Z])|粤|粵|广东话|廣東話|CANTONESE/i.test(trimmed),
    日: /(^|[^A-Z])(JP|JPN|JA)($|[^A-Z])|日|日本|JAPANESE/i.test(trimmed),
    英: /(^|[^A-Z])(EN|ENG)($|[^A-Z])|英|ENGLISH/i.test(trimmed),
    泰: /(^|[^A-Z])(TH|THA)($|[^A-Z])|泰|THAI/i.test(trimmed)
  };

  if (/[中华華]/.test(trimmed) && !matches.简 && !matches.繁 && !matches.粤) {
    return undefined;
  }

  for (const language of NormalizedLanguages) {
    if (matches[language]) {
      languages.push(language);
    }
  }

  return languages.length > 0 ? languages : undefined;
}

function normalizeLanguages(languages: string[]): string[] {
  const normalized = new Set<string>();
  const unknown: string[] = [];

  for (const language of languages) {
    const parts = normalizeLanguage(language);
    if (parts) {
      parts.forEach((part) => normalized.add(part));
    } else if (!unknown.includes(language)) {
      unknown.push(language);
    }
  }

  return [...NormalizedLanguages.filter((language) => normalized.has(language)), ...unknown];
}
