export interface ParseOptions {
  // Pass fansub to use specify parser variants
  fansub?: string;
}

export interface ParseResult {
  title: string;

  // Other titles like translations
  titles?: string[];

  // fansub info
  fansub?: {
    // fansub name, may be set with specific fansub
    name: string;

    // fansub name in title
    alias?: string;

    // collab fansubs name
    collab?: string[];

    // fansub tags, e.g. 個人製作合集
    tags?: string[];
  };

  // season info
  season?: SeasonInfo;

  // seasons range, e.g. S1-S2
  seasonsRange?: SeasonsRange;

  // part info
  part?: {
    // part number
    number: number;
  };

  // Type, e.g. OVA
  type?: string;

  // episode info
  episode?: EpisodeInfo;

  // volume info
  volume?: VolumeInfo;

  // Multiple episodes
  episodes?: EpisodeInfo[];

  // episode range
  episodesRange?: EpisodesRange;

  // 发布版本
  version?: number;

  // 字幕信息
  subtitle?: SubtitleInfo;

  // 来源类型, e.g. WEB-DL
  source?: string;

  // 来源平台, e.g. Baha
  platform?: string;

  // 发布年份
  year?: number;

  // 发布月份
  month?: number;

  // Video file info
  file?: FileInfo;

  // Tags
  tags?: string[];

  // 变体版本, e.g. 日配, 中配
  variants?: string[];

  // 检索用
  search?: string[];
}

export interface SubtitleInfo {
  format?: string;

  encoding?: string;

  languages?: string[];
}

export interface EpisodeInfo {
  number: number;

  // 总集篇 xx.5
  numberSub?: number;

  // END, FIN
  type?: string;

  // Episode title
  title?: string;
}

export interface VolumeInfo {
  number: number;
}

export interface EpisodesRange {
  from: number;

  fromSub?: number;

  to: number;

  toSub?: number;

  // 类型, e.g. 修正合集
  type?: string;
}

export interface SeasonInfo {
  // season number
  number: number;

  // season title
  title?: string;
}

export interface SeasonsRange {
  from: number;

  to: number;
}

export interface FileInfo {
  extension?: string;

  audio?: {
    term?: string;
  };

  video?: {
    term?: string;

    resolution?: string;

    fps?: string;
  };
}
