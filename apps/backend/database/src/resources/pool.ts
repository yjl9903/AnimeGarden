export function StringPool() {
  let keyCache: Record<string, string> = {};

  return {
    get(str: string) {
      const value = keyCache[str];
      if (value) return value;

      return (keyCache[str] = str);
    },
    clear() {
      keyCache = {};
    }
  };
}

export const TitlePool = StringPool();

export const MagnetPool = StringPool();

export const TrackerPool = StringPool();