export type ElementCategory =
  | 'season'
  | 'seasonPrefix'
  | 'title'
  | 'type'
  | 'year'
  | 'episodeNumber'
  | 'episodePrefix'
  | 'episodeTitle'
  | 'language'
  | 'releaseGroup'
  | 'releaseInformation'
  | 'releaseVersion'
  | 'source'
  | 'subtitles'
  // Audio and Video
  | 'audioTerm'
  | 'videoResolution'
  | 'videoTerm'
  // Volume
  | 'volumeNumber'
  | 'volumePrefix'
  // File related
  | 'checksum'
  | 'extension'
  | 'filename'
  // Other
  | 'other'
  | 'unknown';
