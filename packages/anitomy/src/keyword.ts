import { ElementCategory } from './element';
import type { ParsedResult } from './types';

import { TextRange } from './token';

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
    { category: ElementCategory.AudioTerm, list: ['Dual Audio'] },
    { category: ElementCategory.VideoTerm, list: ['H264', 'H.264', 'h264', 'h.264'] },
    {
      category: ElementCategory.VideoResolution,
      list: ['480p', '480P', '720p', '720P', '1080p', '1080P']
    },
    { category: ElementCategory.Source, list: ['Blu-Ray'] }
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
    add(ElementCategory.AnimeSeasonPrefix, optionsUnidentifiable, ['SAISON', 'SEASON']);

    // Type
    add(ElementCategory.AnimeType, optionsUnidentifiable, [
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
    add(ElementCategory.AnimeType, optionsUnidentifiableUnsearchable, ['SP']);
    add(ElementCategory.AnimeType, optionsUnidentifiableInvalid, [
      'ED',
      'ENDING',
      'NCED',
      'NCOP',
      'OP',
      'OPENING',
      'PREVIEW',
      'PV'
    ]);

    add(ElementCategory.AudioTerm, optionsDefault, [
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
    add(ElementCategory.VideoTerm, optionsDefault, [
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
      'HEVC-10BIT',
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

    add(ElementCategory.Source, optionsDefault, [
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
      'WEBDL',
      'WEB-DL',
      'WEBRIP',
      'WEB-RIP'
    ]);

    // Language
    add(ElementCategory.Language, optionsDefault, [
      'ENG',
      'ENGLISH',
      'ESPANO',
      'JAP',
      'PT-BR',
      'SPANISH',
      'VOSTFR',
      // feat: chinese
      'CHT',
      'CHS',
      '简中',
      '繁中',
      '简体',
      '繁體'
    ]);
    add(ElementCategory.Language, optionsUnidentifiable, ['ESP', 'ITA']);

    add(ElementCategory.Subtitles, optionsDefault, [
      'ASS',
      'GB', // feat: 简体字幕
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
    add(ElementCategory.EpisodePrefix, optionsDefault, [
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
    add(ElementCategory.EpisodePrefix, optionsInvalid, ['E', '\\x7B2C']);

    // Volume
    add(ElementCategory.VolumePrefix, optionsDefault, ['VOL', 'VOL.', 'VOLUME']);

    // Release
    add(ElementCategory.ReleaseGroup, optionsDefault, ['Baha', 'THORA']);
    add(ElementCategory.ReleaseInformation, optionsDefault, [
      'BATCH',
      'COMPLETE',
      'PATCH',
      'REMUX'
    ]);
    add(ElementCategory.ReleaseInformation, optionsUnidentifiable, ['END', 'FINAL']);
    add(ElementCategory.ReleaseVersion, optionsDefault, [
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
    add(ElementCategory.Other, optionsDefault, [
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
    add(ElementCategory.FileExtension, optionsDefault, [
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
    add(ElementCategory.FileExtension, optionsInvalid, [
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

  public static normalize(text: string) {
    return text.toLocaleUpperCase();
  }

  public static contains(category: ElementCategory, keyword: string) {
    const map = this.container(category);
    const value = map.get(keyword);
    return value && value.category === category;
  }

  public static container(category: ElementCategory) {
    return category === 'extension' ? this.extensions : this.keys;
  }

  public static find(keyword: string, category: ElementCategory) {
    const map = this.container(category);
    if (!map.has(keyword)) {
      return undefined;
    }
    const entry = map.get(keyword)!;
    if (category !== 'unknown' && entry.category !== category) {
      return undefined;
    }
    return entry;
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

export const Fansubs = new Set([
  '猎户发布组',
  '猎户手抄部',
  '北宇治字幕组',
  '北宇治Anarchism字幕组',
  '動漫花園',
  '拨雪寻春',
  'NC-Raws',
  '喵萌奶茶屋',
  'Lilith-Raws',
  '魔星字幕团',
  '桜都字幕组',
  '天月動漫&發佈組',
  '极影字幕社',
  'LoliHouse',
  '悠哈C9字幕社',
  '幻月字幕组',
  '天使动漫论坛',
  '动漫国字幕组',
  '幻樱字幕组',
  '爱恋字幕社',
  'DBD制作组',
  'c.c动漫',
  '萝莉社活动室',
  '千夏字幕组',
  'IET字幕組',
  '诸神kamigami字幕组',
  '霜庭云花Sub',
  'GMTeam',
  '风车字幕组',
  // '雪飄工作室(FLsnow)',
  'MCE汉化组',
  '丸子家族',
  '星空字幕组',
  '梦蓝字幕组',
  'LoveEcho!',
  'SweetSub',
  '枫叶字幕组',
  'Little Subbers!',
  '轻之国度',
  '云光字幕组',
  '豌豆字幕组',
  '驯兽师联盟',
  '中肯字幕組',
  'SW字幕组',
  '银色子弹字幕组',
  '风之圣殿',
  'YWCN字幕组',
  'KRL字幕组',
  '华盟字幕社',
  '波洛咖啡厅',
  '动音漫影',
  'VCB-Studio',
  'DHR動研字幕組',
  '80v08',
  '肥猫压制',
  'Little字幕组',
  'AI-Raws',
  '离谱Sub',
  '虹咲学园烤肉同好会',
  'ARIA吧汉化组',
  '柯南事务所',
  '百冬練習組',
  '冷番补完字幕组',
  '爱咕字幕组',
  '極彩字幕组',
  'AQUA工作室',
  '未央阁联盟',
  '届恋字幕组',
  '夜莺家族',
  'TD-RAWS',
  '夢幻戀櫻',
  'WBX-SUB',
  'Liella!の烧烤摊',
  'Amor字幕组',
  'MingYSub',
  '小白GM',
  'Sakura',
  'EMe',
  'Alchemist',
  '黑岩射手吧字幕组',
  'ANi',
  'MSB制作組'
]);
