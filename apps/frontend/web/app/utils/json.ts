export function safeParseJSON<T>(
  text: string | undefined,
  options?: { decode?: boolean }
): { result: T; error: undefined } | { result: undefined; error: unknown } {
  if (!text) return { result: undefined, error: new Error('text is undefined') };
  try {
    if (options?.decode) {
      text = base64URLdecode(text);
    }
    return { result: JSON.parse(text) as T, error: undefined };
  } catch (error) {
    console.log(error);
    return { result: undefined, error };
  }
}

export function base64URLencode(str: string) {
  const base64Encoded = btoa(encodeURIComponent(str));
  return base64Encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64URLdecode(str: string) {
  const base64Encoded = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  const base64WithPadding = base64Encoded + padding;
  return decodeURIComponent(atob(base64WithPadding));
}
