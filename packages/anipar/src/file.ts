export const FileExtensions = new Set([
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

export function parseFileExtension(title: string) {
  const match = /\.([^.\/\s]+)\s*$/.exec(title);
  if (!match) return { title };

  const extension = match[1].toUpperCase();
  if (!FileExtensions.has(extension)) return { title };

  return {
    title: title.slice(0, match.index).trimEnd(),
    extension
  };
}
