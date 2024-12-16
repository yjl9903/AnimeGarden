export interface ParseOptions {}

export interface ParseResult {
  title: string;

  // Other titles like translations
  titles?: string[];

  // fansub info
  fansub?: {
    // fansub name
    name: string;

    // collab fansubs name
    collab?: string[];
  };

  // season info
  season?: {
    // season number
    number: number;

    // season title
    title?: string;
  };

  // Type, e.g. OVA
  type?: string;

  // episode info
  episode?: EpisodeInfo;

  // Multiple episodes
  episodes?: EpisodeInfo[];

  // episode range
  episodeRange?: {
    from: number;

    to: number;
  };

  // Release version
  version?: string;

  // Video language
  language?: string;

  // Subtitles including language, e.g. 简日内嵌
  subtitles?: string;

  // Source, e.g. WEB-DL
  source?: string;

  // Source platform, e.g. Baha
  platform?: string;

  // Onair year
  year?: number;

  // Onair month
  month?: number;

  // Video file info
  file?: FileInfo;

  // Other tags
  tags: string[];
}

export interface EpisodeInfo {
  number: number;

  // 总集篇 xx.5
  numberSub?: number;

  // Episode title
  title?: string;
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
