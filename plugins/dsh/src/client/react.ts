import type * as ReactNamespace from 'react';

/** The React runtime object the Harness module loader hands to the plugin factory. */
export type ReactRuntime = typeof ReactNamespace;

let runtime: ReactRuntime | null = null;

/**
 * Store the React runtime supplied by the module loader.
 * @param react - the browser React module.
 */
export function setReact(react: ReactRuntime): void {
  runtime = react;
}

/**
 * Read the React runtime. Hooks and the classic JSX transform both need this value,
 * and it must be the loader-provided module so the bundle never carries a second React.
 * @returns the React runtime.
 * @throws when a component renders before `createPlugin` stored the runtime.
 */
export function getReact(): ReactRuntime {
  if (runtime === null) {
    throw new Error('dsh-plugin-animegarden: React runtime is not initialized');
  }
  return runtime;
}

/** Read the runtime without throwing; `null` before the loader invokes the factory. */
export function peekReact(): ReactRuntime | null {
  return runtime;
}
