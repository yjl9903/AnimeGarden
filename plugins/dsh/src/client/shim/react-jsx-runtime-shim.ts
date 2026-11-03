import type * as ReactTypes from 'react';
import type * as JsxRuntime from 'react/jsx-runtime';

import { getReact } from '../react.js';

type JsxFunction = typeof JsxRuntime.jsx;
type JsxsFunction = typeof JsxRuntime.jsxs;

/**
 * Forward a JSX runtime call to the loader-provided React. `@tanstack/react-query`
 * ships precompiled JSX that imports `react/jsx-runtime` at module-evaluation time,
 * so this shim must not import the React runtime itself.
 */
export const jsx: JsxFunction = ((type: unknown, props: unknown, key?: ReactTypes.Key) => {
  const config = key === undefined ? props : { ...(props as Record<string, unknown>), key };
  return getReact().createElement(type as never, config as never) as ReactTypes.ReactElement;
}) as JsxFunction;

/** Same implementation as {@link jsx}; React's runtime treats both as element factories. */
export const jsxs: JsxsFunction = jsx as unknown as JsxsFunction;

/**
 * React's stable Fragment symbol. `createElement` accepts it as an element type,
 * so this needs no access to the loader-provided React at module-evaluation time.
 */
export const Fragment: typeof JsxRuntime.Fragment = Symbol.for(
  'react.fragment'
) as unknown as typeof JsxRuntime.Fragment;
