import type * as ReactTypes from 'react';

import { getReact, peekReact } from '../react.js';

/**
 * Lazy stand-in for a `React.Context` created before the loader-provided React
 * exists. Bundled libraries (`@tanstack/react-query`) call `createContext` at
 * module-evaluation time, and some even read `.Provider` then, while the real
 * React instance only arrives when the Harness module loader invokes the plugin
 * factory. Property access therefore never throws: the provider/consumer wrappers
 * resolve the real context only while rendering.
 */
interface LazyContext<T> {
  __agpLazyContext: true;
  defaultValue: T;
  real: ReactTypes.Context<T> | undefined;
  provider: ReactTypes.Provider<T> | undefined;
  consumer: ReactTypes.Consumer<T> | undefined;
  readonly Provider: ReactTypes.Provider<T>;
  readonly Consumer: ReactTypes.Consumer<T>;
}

/** Resolve the real context once React is available, caching it for stable identity. */
function realContext<T>(lazy: LazyContext<T>): ReactTypes.Context<T> {
  if (lazy.real === undefined) {
    lazy.real = getReact().createContext(lazy.defaultValue);
  }
  return lazy.real;
}

/** A stable wrapper component that forwards to the real context provider. */
function lazyProvider<T>(lazy: LazyContext<T>): ReactTypes.Provider<T> {
  if (lazy.provider === undefined) {
    lazy.provider = function LazyContextProvider(props: {
      value: T;
      children?: ReactTypes.ReactNode;
    }) {
      const React = getReact();
      return React.createElement(
        realContext(lazy).Provider as unknown as ReactTypes.ElementType,
        props as unknown as ReactTypes.Attributes
      );
    } as unknown as ReactTypes.Provider<T>;
  }
  return lazy.provider;
}

/** A stable wrapper component that forwards to the real context consumer. */
function lazyConsumer<T>(lazy: LazyContext<T>): ReactTypes.Consumer<T> {
  if (lazy.consumer === undefined) {
    lazy.consumer = function LazyContextConsumer(props: {
      children: (value: T) => ReactTypes.ReactNode;
    }) {
      const React = getReact();
      return React.createElement(
        realContext(lazy).Consumer as unknown as ReactTypes.ElementType,
        props as unknown as ReactTypes.Attributes
      );
    } as unknown as ReactTypes.Consumer<T>;
  }
  return lazy.consumer;
}

/**
 * Create a context placeholder immediately; the real context is created from the
 * loader-provided React the first time a value is read or a provider is rendered.
 * @param defaultValue - the context default value.
 * @returns a context-shaped placeholder.
 */
export function createContext<T>(defaultValue: T): ReactTypes.Context<T> {
  const lazy: LazyContext<T> = {
    __agpLazyContext: true,
    defaultValue,
    real: undefined,
    provider: undefined,
    consumer: undefined,
    get Provider() {
      return lazyProvider(lazy);
    },
    get Consumer() {
      return lazyConsumer(lazy);
    }
  };
  return lazy as unknown as ReactTypes.Context<T>;
}

/**
 * Read a context through the loader-provided React, resolving lazy placeholders.
 * @param context - the context to read.
 * @returns the current context value.
 */
export function useContext<T>(context: ReactTypes.Context<T>): T {
  if ((context as unknown as Partial<LazyContext<T>>).__agpLazyContext === true) {
    return getReact().useContext(realContext(context as unknown as LazyContext<T>));
  }
  return getReact().useContext(context);
}

/** Forward `useCallback` to the loader-provided React. */
export function useCallback<T extends (...args: never[]) => unknown>(
  callback: T,
  deps: ReactTypes.DependencyList
): T {
  return getReact().useCallback(callback, deps);
}

/** Forward `useEffect` to the loader-provided React. */
export function useEffect(
  effect: ReactTypes.EffectCallback,
  deps?: ReactTypes.DependencyList
): void {
  getReact().useEffect(effect, deps);
}

/** Forward `useMemo` to the loader-provided React. */
export function useMemo<T>(factory: () => T, deps: ReactTypes.DependencyList): T {
  return getReact().useMemo(factory, deps);
}

/** Forward `useRef` to the loader-provided React. */
export function useRef<T>(initialValue: T): ReactTypes.RefObject<T> {
  return getReact().useRef<T>(initialValue);
}

/** Forward `useState` to the loader-provided React. */
export function useState<S>(
  initialState: S | (() => S)
): [S, ReactTypes.Dispatch<ReactTypes.SetStateAction<S>>] {
  return getReact().useState<S>(initialState);
}

/** Forward `useSyncExternalStore` to the loader-provided React. */
export function useSyncExternalStore<T>(
  subscribe: (onStoreChange: () => void) => () => void,
  getSnapshot: () => T,
  getServerSnapshot?: () => T
): T {
  return getReact().useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * React's element brand used before the runtime is initialized. The Harness shell
 * provides React 18.3.1, whose renderer recognizes `Symbol.for('react.element')`.
 */
const FALLBACK_ELEMENT = Symbol.for('react.element');

/** React's `forward_ref` brand, used before the runtime is initialized. */
const FALLBACK_FORWARD_REF = Symbol.for('react.forward_ref');

/** React's fragment brand, addressable without the runtime. */
const FALLBACK_FRAGMENT = Symbol.for('react.fragment');

/**
 * Fabricate a React element without the runtime.
 *
 * `sonner` builds its toast icons with `React.createElement` at module evaluation
 * time, before the loader hands us React. React accepts plain branded elements, so
 * the icons can be assembled now and rendered once the real renderer exists.
 */
function fallbackCreateElement(
  type: unknown,
  props?: Record<string, unknown> | null,
  ...children: unknown[]
): unknown {
  const resolved: Record<string, unknown> = { ...(props ?? {}) };
  if (children.length === 1) resolved.children = children[0];
  else if (children.length > 1) resolved.children = children;
  return {
    $$typeof: FALLBACK_ELEMENT,
    type,
    key: null,
    ref: null,
    props: resolved,
    _owner: null
  };
}

/** Fabricate a `forwardRef` component object (React only reads the brand/render). */
function fallbackForwardRef(render: unknown): unknown {
  return { $$typeof: FALLBACK_FORWARD_REF, render };
}

/** Recognize fabricated elements before the runtime exists. */
function fallbackIsValidElement(value: unknown): boolean {
  return (
    value !== null &&
    typeof value === 'object' &&
    (value as { $$typeof?: unknown }).$$typeof === FALLBACK_ELEMENT
  );
}

/**
 * Default export mirroring the loader-provided React surface.
 *
 * Libraries such as `sonner` use `import React from 'react'` and may touch
 * `React.createElement` / `React.forwardRef` while the module graph is still
 * evaluating. Property lookups therefore fall back to branded stand-ins until the
 * loader initializes the runtime; hooks and render-time helpers always come from
 * the real instance.
 */
const lazyReact = new Proxy(
  {},
  {
    get: (_target, property) => {
      const runtime = peekReact();
      if (runtime !== null) {
        return (runtime as unknown as Record<PropertyKey, unknown>)[property];
      }
      switch (property) {
        case 'createElement':
          return fallbackCreateElement;
        case 'forwardRef':
          return fallbackForwardRef;
        case 'isValidElement':
          return fallbackIsValidElement;
        case 'Fragment':
          return FALLBACK_FRAGMENT;
        default:
          throw new Error(
            `dsh-plugin-animegarden: React.${String(property)} was read before the loader initialized React`
          );
      }
    }
  }
);

export default lazyReact;
