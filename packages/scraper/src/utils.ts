export function splitOnce(text: string, separator: string): [string, string] {
  const found = text.indexOf(separator);
  if (found === -1) {
    return [text, ''];
  }
  const first = text.slice(0, found);
  const second = text.slice(found);
  return [first, second];
}