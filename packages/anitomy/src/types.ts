import type { ElementCategory } from './element';

export interface AnitomyOptions {
  delimiters: string;

  parseEpisodeNumber: boolean;

  parseEpisodeTitle: boolean;

  parseFileExtension: boolean;

  parseReleaseGroup: boolean;
}

export type ParsedResult = Partial<Record<ElementCategory, string>>;

export interface AnitomyResult {
  title: string | undefined;

  type: string | undefined;

  season: string | undefined;

  year: number | undefined;

  month: number | undefined;

  language: string | undefined;

  subtitles: string | undefined;

  source: string | undefined;

  episode: {
    number: number | undefined;

    numberAlt: number | undefined;

    title: string | undefined;
  };

  volume: {
    number: number | undefined;
  };

  video: {
    term: string | undefined;

    resolution: string | undefined;
  };

  audio: {
    term: string | undefined;
  };

  file: {
    name: string;

    checksum: string | undefined;

    extension: string | undefined;
  };

  // prefix: {
  //   season: string | undefined;
  //   volume: string | undefined;
  //   episode: string | undefined;
  // };
}
