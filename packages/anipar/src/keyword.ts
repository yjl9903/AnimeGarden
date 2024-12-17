import { Context } from './context';

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

const VideoResolution = new Set(['480P', '720P', '1080P', '1920x1080', '1280x720']);

const Source = new Set([
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
  'WEB-RIP',
  'WEB-MKV'
]);

const Platfrom = new Set(['Baha', 'B-Global', 'ABEMA', 'CR', 'ViuTV']);

const Type = new Set([
  'GEKIJOUBAN',
  'MOVIE',
  'OAD',
  'OAV',
  'ONA',
  'OVA',
  'SPECIAL',
  'SPECIALS',
  'TV',
  '特别篇',
  '特別篇',
  '特別編',
  '特别话',
  '特別话',
  '特別話',
  '番外篇',
  '番外編',
  //
  'SP',
  //
  'ED',
  'ENDING',
  'NCED',
  'NCOP',
  'OP',
  'OPENING',
  'PREVIEW',
  'PV'
]);

const Languages = new Set(['CHS', 'CHT', '简体', '繁體']);

const Subtitles = new Set([
  'ASS',
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
  'SUBTITLED'
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

// 招募的前缀
const Hiring = new Set(['招募']);

export function parseRightTags(ctx: Context) {}

export function parseLeftTags(ctx: Context) {}
