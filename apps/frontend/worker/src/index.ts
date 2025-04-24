import { z } from 'zod';
import { memoAsync } from 'memofunc';

import { type FilterOptions, stringifyURLSearch, fetchAPI } from '@animegarden/client';

import type { Env } from './types';

import { FilterSchema } from './legacy';

type User = {
  id: string | number;

  name: string;

  avatar?: string | null;

  providers: Record<string, { providerId: string }>;
};

const ManyFilterSchema = z.union([z.array(FilterSchema), FilterSchema.transform((f) => [f])]);

const getPublishers = memoAsync(async () => {
  const resp = (await import('./users.json')).default;
  const users = (resp?.users ?? []) as User[];

  const map = new Map<string, User>();
  for (const team of users) {
    if (team.providers.dmhy) {
      map.set(team.providers.dmhy.providerId, team);
    }
    if (team.providers.moe) {
      map.set(team.providers.moe.providerId, team);
    }
  }
  return map;
});

const getFansubs = memoAsync(async () => {
  // const resp = await fetchAPI<{ teams: User[] }>('/teams').catch((err) => {
  //   console.error(err);
  //   return undefined;
  // });
  const resp = (await import('./teams.json')).default;
  const teams = (resp?.teams ?? []) as User[];

  const map = new Map<string, User>();
  for (const team of teams) {
    if (team.providers.dmhy) {
      map.set(team.providers.dmhy.providerId, team);
    }
    if (team.providers.moe) {
      map.set(team.providers.moe.providerId, team);
    }
  }
  return map;
});

export default {
  async fetch(request: Request, _env: Env, _ctx: ExecutionContext) {
    const destinationURL = new URL(request.url);
    destinationURL.port = '';

    if (destinationURL.pathname.startsWith('/api')) {
      destinationURL.host = 'api.animes.garden';
    } else if (destinationURL.pathname.startsWith('/feed.xml')) {
      destinationURL.host = 'api.animes.garden';

      const getFilter = (url: URL) => {
        const filterString = decodeURIComponent(url.searchParams.get('filter') ?? '');
        try {
          const rawFilter = filterString ? JSON.parse(filterString) : { page: 1, pageSize: 1000 };
          return { ok: true, filter: rawFilter } as const;
        } catch (error) {
          console.error('Parse filter JSON', url.toString(), filterString);
          console.error(error);
          // @ts-ignore
          return { ok: false, input: filterString, error: error?.message } as const;
        }
      };

      // Handle JSON parse error
      const rawFilter = getFilter(destinationURL);
      if (!rawFilter.ok) {
        return new Response(
          JSON.stringify({
            status: 400,
            detail: {
              url: destinationURL.toString(),
              filter: rawFilter.input,
              message: rawFilter.error
            }
          }),
          { status: 400 }
        );
      }

      const filter = ManyFilterSchema.safeParse(rawFilter.filter);
      if (filter.success && filter.data.length > 0) {
        const options = { ...filter.data[0] };
        console.log('Filter:', options);

        if (options.fansubName) {
          (options as FilterOptions).fansubs = options.fansubName;
          delete options.fansubName;
        }
        if (options.fansubId) {
          const all = await getFansubs();
          (options as FilterOptions).fansubs = options.fansubId
            .map((id) => all.get(id)?.name)
            .filter(Boolean);
          delete options.fansubId;
        }
        if (options.publisherId) {
          const all = await getPublishers();
          (options as FilterOptions).publishers = options.publisherId
            .map((id) => all.get(id)?.name)
            .filter(Boolean);
          delete options.publisherId;
        }

        destinationURL.search = stringifyURLSearch(options as any).toString();
      } else {
        destinationURL.search = '';
      }
    } else {
      destinationURL.host = 'animes.garden';

      if (destinationURL.searchParams.has('fansubId')) {
        const all = await getFansubs();
        const name = all.get(destinationURL.searchParams.get('fansubId') ?? '')?.name;
        if (name) {
          destinationURL.searchParams.set('fansub', name);
        }
        destinationURL.searchParams.delete('fansubId');
      }
      if (destinationURL.searchParams.has('fansubName')) {
        const name = destinationURL.searchParams.get('fansubName') ?? '';
        if (name) {
          destinationURL.searchParams.set('fansub', name);
        }
        destinationURL.searchParams.delete('fansubName');
      }
      if (destinationURL.searchParams.has('publisherId')) {
        const all = await getPublishers();
        const name = all.get(destinationURL.searchParams.get('publisherId') ?? '')?.name;
        if (name) {
          destinationURL.searchParams.set('publisher', name);
        }
        destinationURL.searchParams.delete('publisherId');
      }
    }

    console.log(`Redirect ${request.url} -> ${destinationURL.toString()}`);

    const statusCode = 301;

    return Response.redirect(destinationURL.toString(), statusCode);
  }
};
