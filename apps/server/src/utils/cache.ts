type AsyncFn = (...params: any[]) => Promise<any>;

export interface MemoOptions<F extends AsyncFn> {
  /**
   * Serialize the function call arguments
   * This is used to identify cache key
   */
  getKey: (...args: Parameters<F>) => string;

  /**
   * Default expiration time duration (in milliseconds)
   */
  expirationTtl: number;

  /**
   * Max cache size
   */
  maxSize: number;

  /**
   * Auto start GC
   */
  autoStartGC?: boolean;
}

export interface MemoFunc<F extends AsyncFn> {
  (...args: Parameters<F>): ReturnType<F>;

  clear: () => void;

  startGC: () => void;

  stopGC: () => void;
}

enum Status {
  Ok,
  Error,
  Waiting
}

interface CacheItem {
  status: Status;

  value: any;

  error: unknown;

  expiration: number | undefined;

  callbacks: Set<{ res: (value: any) => void; rej: (error: unknown) => void }>;
}

export function memo<F extends AsyncFn>(fn: F, options: MemoOptions<F>): MemoFunc<F> {
  const caches = new Map<string, CacheItem>();

  const memoFunc = async function (...args: Parameters<F>) {
    const key = options.getKey(...args);
    const cache = caches.get(key);

    if (cache) {
      if (cache.status === Status.Waiting) {
        return new Promise((res, rej) => {
          cache.callbacks.add({ res, rej });
        });
      }

      if (!cache.expiration || new Date().getTime() < cache.expiration) {
        if (cache.status === Status.Ok) {
          return cache.value;
        } else if (cache.status === Status.Error) {
          throw cache.error;
        }
      } else {
        cache.status = Status.Waiting;
        cache.value = undefined;
        cache.error = undefined;
        cache.expiration = undefined;
        cache.callbacks = new Set();
      }
    }

    {
      const item: CacheItem = cache ?? {
        status: Status.Waiting,
        value: undefined,
        error: undefined,
        expiration: undefined,
        callbacks: new Set()
      };
      caches.set(key, item);

      // 缓存容量过大, 提前清空
      if (caches.size > options.maxSize * 1.5) {
        setTimeout(() => {
          memoFunc.clear();
        });
      }

      try {
        const value = await fn(...args);

        item.status = Status.Ok;
        item.value = value;
        item.expiration = new Date().getTime() + options.expirationTtl;

        const callbacks = item.callbacks;
        setTimeout(() => {
          for (const { res } of callbacks) {
            res(value);
          }
          if (callbacks === item.callbacks) {
            item.callbacks = new Set();
          }
        });

        return value;
      } catch (error) {
        item.status = Status.Error;
        item.error = error;
        item.expiration = new Date().getTime() + options.expirationTtl;

        const callbacks = item.callbacks;
        setTimeout(() => {
          for (const { rej } of callbacks) {
            rej(error);
          }
          if (callbacks === item.callbacks) {
            item.callbacks = new Set();
          }
        });

        throw error;
      }
    }
  } as MemoFunc<F>;

  memoFunc.clear = () => {
    const now = new Date().getTime();
    const keys = [...caches.keys()];

    for (const key of keys) {
      const item = caches.get(key);
      if (!item) continue;
      if (item.status === Status.Waiting) continue;

      if (item.expiration && now < item.expiration) {
        caches.delete(key);
      }
    }

    if (caches.size > options.maxSize) {
      setTimeout(() => {
        const items = [...caches.entries()]
          .filter((item) => item[1].status !== Status.Waiting)
          .sort((lhs, rhs) => (lhs[1].expiration || 0) - (rhs[1].expiration || 0));

        for (let i = 0; i < items.length - options.maxSize; i++) {
          const item = items[i];
          caches.delete(item[0]);
        }
      });
    }
  };

  let timeout!: NodeJS.Timeout;
  memoFunc.startGC = () => {
    if (timeout) return;

    const cleaup = () => {
      memoFunc.clear();

      timeout = setTimeout(cleaup, options.expirationTtl);
    };
    timeout = setTimeout(cleaup, options.expirationTtl);
  };
  memoFunc.stopGC = () => {
    if (timeout) {
      clearTimeout(timeout);
    }
  };

  if (options.autoStartGC !== false) {
    memoFunc.startGC();
  }

  return memoFunc;
}
