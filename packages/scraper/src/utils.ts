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

export function toShanghai(date: Date) {
  const offset = -480 - new Date().getTimezoneOffset();
  return new Date(date.getTime() + offset * 60 * 1000);
}
