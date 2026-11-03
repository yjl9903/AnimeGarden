/**
 * Minimal `react-dom` substitute for bundled libraries.
 *
 * `sonner` imports `react-dom` only for `flushSync` when applying timer-driven
 * toast updates. The plugin renders through the host's own react-dom instance, so
 * invoking the callback synchronously is equivalent here and keeps the classic
 * script artifact free of a second renderer.
 */

/**
 * Run a state update callback synchronously.
 * @param callback - the update to apply.
 */
export function flushSync(callback: () => void): void {
  callback();
}

const reactDOM = { flushSync };

export default reactDOM;
