export function splitOnce(text: string, separator: string): [string, string] {
  const found = text.indexOf(separator);
  if (found === -1) {
    return [text, ''];
  }
  const first = text.slice(0, found);
  const second = text.slice(found);
  return [first, second];
}

export function stripSuffix(text: string, suffixes: string[]) {
  for (const suffix of suffixes) {
    if (text.endsWith(suffix)) {
      return text.slice(0, text.length - suffix.length);
    }
  }
  return text;
}

export function replaceSuffix(text: string, suffixes: Record<string, string>) {
  for (const [suffix, replaced] of Object.entries(suffixes)) {
    if (text.endsWith(suffix)) {
      return text.slice(0, text.length - suffix.length) + replaced;
    }
  }
  return text;
}

export function removeExtraSpaces(str: string): string {
  return str.replace(/\s+/g, ' ').trim();
}

export function removePunctuations(input: string, replaceValue = ' '): string {
  return input.replace(/[\p{P}\p{S}]/gu, replaceValue);
}

export function parseSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`;
}
