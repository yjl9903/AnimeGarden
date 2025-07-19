export function nextTick() {
  return new Promise<void>((resolve) => process.nextTick(resolve));
}
