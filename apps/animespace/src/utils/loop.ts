export async function* loop(delay: number): AsyncGenerator<number> {
  for (let i = 0; ; i++) {
    yield i;
    await new Promise<void>((res) => setTimeout(res, delay));
  }
}
