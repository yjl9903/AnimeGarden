import type { ElementCategory } from './element';
import type { ParsedResult } from './types';

import { TextRange, Token } from './token';

export interface KeywordOptions {
  identifiable: boolean;

  searchable: boolean;

  valid: boolean;
}

export type Keyword = {
  category: ElementCategory;
} & KeywordOptions;

export class KeywordManager {
  private static keys = new Map<string, Keyword>();

  private static extensions = new Map<string, Keyword>();

  private static peekEntries: Array<{ category: ElementCategory; list: string[] }> = [
    { category: 'audioTerm', list: ['Dual Audio'] },
    { category: 'videoTerm', list: ['H264', 'H.264', 'h264', 'h.264'] },
    { category: 'videoResolution', list: ['480p', '480P', '720p', '720P', '1080p', '1080P'] },
    { category: 'source', list: ['Blu-Ray'] }
  ];

  static {
    const optionsDefault: KeywordOptions = { identifiable: true, searchable: true, valid: true };
    const optionsInvalid: KeywordOptions = { identifiable: false, searchable: false, valid: false };
    const optionsUnidentifiable: KeywordOptions = {
      identifiable: false,
      searchable: true,
      valid: true
    };
    const optionsUnidentifiableInvalid: KeywordOptions = {
      identifiable: false,
      searchable: true,
      valid: false
    };
    const optionsUnidentifiableUnsearchable: KeywordOptions = {
      identifiable: false,
      searchable: false,
      valid: true
    };

    // Season
    add('seasonPrefix', optionsUnidentifiable, ['SAISON', 'SEASON']);

    // Type
    add('type', optionsUnidentifiable, [
      'GEKIJOUBAN',
      'MOVIE',
      'OAD',
      'OAV',
      'ONA',
      'OVA',
      'SPECIAL',
      'SPECIALS',
      'TV'
    ]);
    add('type', optionsUnidentifiableUnsearchable, ['SP']);
    add('type', optionsUnidentifiableInvalid, [
      'ED',
      'ENDING',
      'NCED',
      'NCOP',
      'OP',
      'OPENING',
      'PREVIEW',
      'PV'
    ]);

    add('audioTerm', optionsDefault, [
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
      'AACX3',
      'AACX4',
      'AC3',
      'EAC3',
      'E-AC-3',
      'FLAC',
      'FLACX2',
      'FLACX3',
      'FLACX4',
      'LOSSLESS',
      'MP3',
      'OGG',
      'VORBIS',
      // Audio language
      'DUALAUDIO',
      'DUAL AUDIO'
    ]);
    add('videoTerm', optionsDefault, [
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
      'HQ',
      'LQ',
      // Video resolution
      'HD',
      'SD'
    ]);

    add('source', optionsDefault, [
      'BD',
      'BDRIP',
      'BLURAY',
      'BLU-RAY',
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
      'WEBCAST',
      'WEBRIP'
    ]);

    // Language
    add('language', optionsDefault, [
      'ENG',
      'ENGLISH',
      'ESPANO',
      'JAP',
      'PT-BR',
      'SPANISH',
      'VOSTFR'
    ]);
    add('language', optionsUnidentifiable, ['ESP', 'ITA']);

    add('subtitles', optionsDefault, [
      'ASS',
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
      'SUBTITLED'
    ]);

    // Episode
    add('episodePrefix', optionsDefault, [
      'EP',
      'EP.',
      'EPS',
      'EPS.',
      'EPISODE',
      'EPISODE.',
      'EPISODES',
      'CAPITULO',
      'EPISODIO',
      'FOLGE'
    ]);
    add('episodePrefix', optionsInvalid, ['E', '\\x7B2C']);

    // Volume
    add('volumePrefix', optionsDefault, ['VOL', 'VOL.', 'VOLUME']);

    // Release
    add('releaseGroup', optionsDefault, ['THORA']);
    add('releaseInformation', optionsDefault, ['BATCH', 'COMPLETE', 'PATCH', 'REMUX']);
    add('releaseInformation', optionsUnidentifiable, ['END', 'FINAL']);
    add('releaseVersion', optionsDefault, [
      'V0',
      'V1',
      'V2',
      'V3',
      'V4',
      'V5',
      'V6',
      'V7',
      'V8',
      'V9'
    ]);

    // Other
    add('other', optionsDefault, [
      'REMASTER',
      'REMASTERED',
      'UNCENSORED',
      'UNCUT',
      'TS',
      'VFR',
      'WIDESCREEN',
      'WS'
    ]);

    // File extension
    add('extension', optionsDefault, [
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
    add('extension', optionsInvalid, [
      'AAC',
      'AIFF',
      'FLAC',
      'M4A',
      'MP3',
      'MKA',
      'OGG',
      'WAV',
      'WMA',
      '7Z',
      'RAR',
      'ZIP',
      'ASS',
      'SRT'
    ]);

    function add(category: ElementCategory, options: KeywordOptions, keys: string[]) {
      const map = KeywordManager.container(category);
      for (const key of keys) {
        if (!map.has(key)) {
          map.set(key, { category, ...options });
        }
      }
    }
  }

  public static contains(category: ElementCategory, keyword: string) {
    const map = this.container(category);
    const value = map.get(keyword);
    return value && value.category === category;
  }

  public static container(category: ElementCategory) {
    return category === 'extension' ? this.extensions : this.keys;
  }

  public static peek(range: TextRange) {
    const search = range.toString();
    const result: ParsedResult = {};
    const predefined: TextRange[] = [];
    for (const { category, list } of this.peekEntries) {
      for (const key of list) {
        // StringComparison.CurrentCulture
        // https://learn.microsoft.com/ja-jp/dotnet/api/system.stringcomparison?view=net-7.0
        const foundIdx = search.indexOf(key);
        if (foundIdx === -1) continue;
        result[category] = key;
        predefined.push(range.fork(foundIdx + range.offset, key.length));
      }
    }
    return { result, predefined };
  }
}
