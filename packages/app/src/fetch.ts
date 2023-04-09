import type { Resource } from 'animegarden';

import { WORKER_BASE } from './constant';

export async function fetchResources(page: number) {
  const resources = await fetch(new URL(`/resources?page=${page}`, 'https://' + WORKER_BASE))
    .then((r) => r.json())
    .then((r: any) => r.resources as Resource[]);
  return resources;
}
