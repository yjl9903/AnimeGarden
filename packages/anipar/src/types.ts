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

  // seasons info, e.g. S3+S4
  seasons?: SeasonInfo[];

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

  // volumes info
  volumes?: VolumeInfo;

  // volumes range
  volumesRange?: VolumesRange;

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

  // tmdb id
  tmdbId?: string;

  // Tags
  tags?: string[];

  // 变体版本, e.g. 日配, 中配
  variants?: string[];

  // 检索用
  search?: string[];
}

export interface SubtitleInfo {
  /**
   * Subtitle delivery type or subtitle file format.
   *
   * @example "外挂字幕"
   * @example "内封字幕"
   * @example "ASS字幕"
   */
  format?: string;

  /**
   * Subtitle text encoding when the release marks a single encoding.
   *
   * @example "GB"
   * @example "BIG5"
   */
  encoding?: string;

  /**
   * Subtitle text encodings when the release contains multiple encoded subtitle files.
   *
   * @example ["GB", "BIG5"] // "GB/BIG5"
   * @example ["GB", "BIG5"] // "外挂GB/BIG5"
   */
  encodings?: string[];

  /**
   * Subtitle languages normalized to short language markers.
   *
   * @example ["简", "繁"]
   * @example ["简", "日"]
   */
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

export interface VolumesRange {
  from: number;

  to: number;

  type?: string;
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
  /**
   * File extension or container suffix parsed from the title.
   *
   * @example "mkv"
   * @example "MP4"
   */
  extension?: string;

  /**
   * Audio stream metadata.
   *
   * @example { codec: "AAC" }
   * @example { codec: "FLAC", trackCount: 2 }
   * @example { codec: "DTS", channels: "5.1" }
   * @example { codec: "Opus" }
   */
  audio?: {
    /**
     * Audio channel layout.
     *
     * @example "2.0"
     * @example "5.1"
     */
    channels?: string;

    /**
     * Audio codec or encoding format.
     *
     * @example "AAC"
     * @example "E-AC-3+AAC"
     * @example "FLAC"
     * @example "Opus"
     */
    codec?: string;

    /**
     * Audio language or language track marker.
     *
     * @example "dual audio"
     */
    language?: string;

    /**
     * Number of audio tracks implied by compact tags.
     *
     * @example 2 // "AACx2"
     * @example 3 // "FLAC×3"
     */
    trackCount?: number;
  };

  /**
   * Video stream metadata.
   *
   * @example { codec: "HEVC", bitDepth: "10-bit", resolution: "1080p" }
   * @example { resolution: "1920x816", fps: "60fps" }
   * @example { enhancement: "AI", resolution: "2160p" }
   */
  video?: {
    /**
     * Video codec or encoder family.
     *
     * @example "AVC"
     * @example "HEVC"
     * @example "DivX"
     */
    codec?: string;

    /**
     * Video enhancement or processing marker.
     *
     * @example "AI" // "AI2160p"
     */
    enhancement?: string;

    /**
     * Video container or legacy video format marker.
     *
     * @example "AVI"
     * @example "RMVB"
     * @example "WMV"
     */
    format?: string;

    /**
     * Non-numeric frame-rate mode.
     *
     * @example "高帧率"
     */
    frameRateMode?: string;

    /**
     * Video quality marker.
     *
     * @example "HDR"
     * @example "HQ"
     * @example "LQ"
     */
    quality?: string;

    /**
     * Video resolution or frame size.
     *
     * @example "1080p"
     * @example "1920x1080"
     * @example "4K"
     */
    resolution?: string;

    /**
     * Video bit depth.
     *
     * @example "8-bit"
     * @example "10-bit"
     */
    bitDepth?: string;

    /**
     * Numeric frame rate marker.
     *
     * @example "23.976fps"
     * @example "60fps"
     */
    fps?: string;
  };
}
