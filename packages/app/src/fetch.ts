import type { Resource } from 'animegarden';

import { WORKER_BASE } from './constant';

export async function fetchResources(
  page: number,
  options: { fansub?: number; publisher?: number } = {}
) {
  const url = new URL(`/resources?page=${page}`, 'https://' + WORKER_BASE);
  if (options.fansub) {
    url.searchParams.set('fansub', '' + options.fansub);
  }
  if (options.publisher) {
    url.searchParams.set('publisher', '' + options.publisher);
  }
  const resources = await fetch(url, {})
    .then((r) => r.json())
    .then((r: any) => r.resources as Resource[]);
  return resources;
}
