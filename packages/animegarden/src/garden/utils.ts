export async function retryFn<T>(fn: () => Promise<T>, count: number): Promise<T> {
  if (count < 0) {
    count = Number.MAX_SAFE_INTEGER;
  }
  let e: any;
  for (let i = 0; i < count; i++) {
    try {
      return await fn();
    } catch (err) {
      e = err;
    }
  }
  throw e;
}
