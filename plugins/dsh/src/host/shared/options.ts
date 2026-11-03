/**
 * Bundle config resolution shared by the Host tools and the browser options.
 *
 * The plugin intentionally exports no `Config` schema: that would require
 * `@deepseek-ai/schemastery`, an npm dependency this dependency-free bundle
 * avoids. The Loader row still passes `config` as a plain object, so the
 * values are read defensively and fall back to the documented defaults
 * instead of failing activation on a malformed value.
 */

import { DefaultBaseURL } from '@animegarden/client';

import { normalizePluginOptions } from '../../shared/config';

import type { ResolvedOptions } from './types';

import { isRecord } from './utils';

/**
 * Resolve the Loader row config.
 *
 * `baseURL` keeps only a non-empty string; the browser options accept only
 * booleans. Everything else falls back to the plugin's built-in defaults.
 *
 * @param config - Loader row config (`baseURL` plus the browser options).
 * @returns the resolved options; `baseURL` has no trailing slash.
 */
export function resolveOptions(config: unknown): ResolvedOptions {
  const raw = isRecord(config) ? config : {};
  const candidate =
    typeof raw.baseURL === 'string' && raw.baseURL.trim().length > 0 ? raw.baseURL : DefaultBaseURL;
  const baseURL = candidate.trim();

  // Keep one canonical form (no trailing slash); the client request builder adds it back.
  return { baseURL: baseURL.replace(/\/+$/, ''), ...normalizePluginOptions(raw) };
}
