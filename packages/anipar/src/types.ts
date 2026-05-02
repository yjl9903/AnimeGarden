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
  season?: {
    // season number
    number: number;

    // season title
    title?: string;
  };

  // part info
  part?: {
    // part number
    number: number;
  };

  // Type, e.g. OVA
  type?: string;

  // episode info
  episode?: EpisodeInfo;

  // Multiple episodes
  episodes?: EpisodeInfo[];

  // episode range
  episodeRange?: EpisodeRange;

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

  // Episode title
  title?: string;
}

export interface EpisodeRange {
  from: number;

  to: number;

  // 类型, e.g. 修正合集
  type?: string;
}

export interface FileInfo {
  extension?: string;

  audio?: {
    term?: string;
  };

  video?: {
    term?: string;

    resolution?: string;
  };
}
