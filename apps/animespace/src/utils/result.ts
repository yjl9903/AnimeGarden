export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export async function tryAsync<T, E>(fn: () => Promise<T>): Promise<Result<T, E>> {
  try {
    const value = await fn();
    return {
      ok: true,
      value
    };
  } catch (error) {
    return {
      ok: false,
      error: error as E
    };
  }
}

export interface MemoAsync<T> {
  (): Promise<T>;

  clear: () => void;
}

export function memoAsync<T>(fn: () => Promise<T>): MemoAsync<T> {
  let promise: Promise<T> | undefined;

  async function run(): Promise<T> {
    if (promise) return promise;
    try {
      promise = fn();
      return await promise;
    } catch (error) {
      promise = undefined;
      throw error;
    }
  }

  (run as MemoAsync<T>).clear = () => {
    promise = undefined;
  };

  return run as MemoAsync<T>;
}
