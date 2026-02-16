import type { Resource } from '@animegarden/client';

import type { DatabaseTorrent } from '../../sqlite/torrent.ts';
import type { DatabaseSubjectFile } from '../../sqlite/subject.ts';

import type { SubjectType } from './schema.ts';

export interface SubjectResourceMetadata {
  type: SubjectType;

  season?: number;

  episode?: number;

  fansub?: string;

  year?: number;

  month?: number;
}

export interface SubjectResource {
  /**
   *
   */
  name: string;

  /**
   * Used for rendering link
   */
  url: string;

  /**
   * Metadata
   */
  metadata: Partial<SubjectResourceMetadata>;

  /**
   * Magnet to be downloaded
   */
  magnet?: string;

  /**
   * Picked files from downloaded torrent
   */
  pickedFiles?: string[];

  /**
   * Related uploaded subject file
   */
  subjectFiles?: DatabaseSubjectFile[];

  /**
   * Related animegarden resource
   */
  animegarden?: Resource<{ tracker: true }>;

  /**
   * Related torrent
   */
  torrent?: DatabaseTorrent;

  /**
   * Created timestamp
   */
  createdAt?: Date;
}

export interface ParsedSubjectResource extends SubjectResource {
  parsed: SubjectResourceMetadata;
}

export interface ExtractedSubjectResource extends ParsedSubjectResource {
  extracted: {
    type: SubjectType;

    filename: string;

    season: number;

    episode: number;

    fansub: string;

    year?: number;

    month?: number;
  };
}
