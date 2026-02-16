import type { FilterOptions } from '@animegarden/client';

import { link } from 'breadc';

import type { System } from '../system/system.ts';

export interface SearchResourcesOptions {
  provider?: string;
  type?: string;
  after?: string;
  before?: string;
  limit?: string | number;
  refresh?: boolean;
  json?: boolean;
}

export async function searchResources(
  system: System,
  texts: string[],
  options: SearchResourcesOptions
) {
  await system.openDatabase();

  const filter: FilterOptions = {};
  if (texts.length > 0) {
    filter.search = texts.map((text) => text.trim());
  }
  if (options.type) {
    filter.types = [options.type];
  }
  if (options.after) {
    filter.after = parseDateOption('after', options.after);
  }
  if (options.before) {
    filter.before = parseDateOption('before', options.before);
  }

  const response = await system.managers.animegarden.fetchResources(filter, options.refresh);

  if (!response.ok) {
    throw response.error ?? new Error('Search anime resources failed.');
  }

  const limit = parsePositiveIntOption(options.limit, 20);
  const items = response.resources.slice(0, limit);

  if (options.json) {
    system.logger.log(JSON.stringify(items, null, 2));
  } else if (!!system.logger.stream.isTTY) {
    if (items.length === 0) {
      system.logger.log('未匹配到资源。');
      return;
    }

    for (const [index, resource] of items.entries()) {
      system.logger.log(
        `${String(index + 1).padStart(2, ' ')}. ${link(resource.title, `https://animes.garden/detail/${resource.provider}/${resource.providerId}`)}`
      );
    }

    system.logger.log();
    system.logger.log(`共匹配 ${response.resources.length} 条，已展示 ${items.length} 条。`);
  } else {
    for (const [index, resource] of items.entries()) {
      system.logger.log(
        `${resource.title} ${`https://animes.garden/detail/${resource.provider}/${resource.providerId}`}`
      );
    }
  }
}

function parseDateOption(name: string, value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid --${name} date: ${value}`);
  }
  return date;
}

function parsePositiveIntOption(value: string | number | undefined, fallback: number) {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  const rounded = Math.floor(parsed);
  if (rounded <= 0) {
    return fallback;
  }
  return rounded;
}
