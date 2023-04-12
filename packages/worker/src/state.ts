import type { Env } from './types';

export async function updateRefreshTimestamp(env: Env) {
  await env.animegarden.put('state/refresh-timestamp', new Date().toISOString());
}

export async function getRefreshTimestamp(env: Env) {
  return new Date((await env.animegarden.get('state/refresh-timestamp')) ?? 0);
}
