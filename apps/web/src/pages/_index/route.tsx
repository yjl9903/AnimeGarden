import { useEffect } from 'react';

import type { CursorPagination, ResolvedFilterOptions, Resource } from '@animegarden/client';
import { Link } from '@tanstack/react-router';

import Layout from '~/layouts/Layout';
import Resources from '~/components/Resources';
import { ResourcesLoadMoreLink } from '~/components/Resources/load-more';
import { getTrackingError, trackFetchResourcesError, trackHomeCalendarClick } from '~/utils';
import { getCalendarSeason } from '~/utils/calendar-season';
import { getCalendarRouteLink } from '~/utils/routes';

import { Error } from '../resources.($page)/Error';
import '../anime/anime.css';

export interface IndexProps {
  data: {
    ok: boolean;
    resources: Resource<{ tracker: true }>[];
    pagination?: CursorPagination;
    filter?: ResolvedFilterOptions;
    timestamp?: Date;
    error: any;
  };
  feedURL: string;
  latestSeason?: string;
  path: string;
  renderError: string;
}

export default function Index({ data, feedURL, latestSeason, path, renderError }: IndexProps) {
  const { ok, resources, pagination, filter, timestamp, error } = data;
  const calendarSeason = getCalendarSeason(latestSeason);

  useEffect(() => {
    if (!error || !ok) return;

    trackFetchResourcesError({
      path,
      error: getTrackingError(error, 'index-fetch-failed')
    });
  }, [error, ok, path]);

  return (
    <Layout feedURL={feedURL} timestamp={timestamp}>
      <div className="w-full pt-13 pb-24">
        <header className="mb-12 lt-sm:mb-6 flex min-h-10 flex-wrap items-baseline gap-4 pl-4 lt-sm:pl-2 lt-sm:gap-2">
          {latestSeason && (
            <h1 className="text-3xl lt-sm:text-2xl lt-sm:w-full font-bold leading-tight tracking-normal select-none">
              <Link
                {...getCalendarRouteLink(latestSeason)}
                className="text-inherit text-link-active"
                onClick={() => trackHomeCalendarClick({ season: latestSeason, source: 'title' })}
              >
                <span
                  className="anime-season-emoji text-2xl font-quicksand font-bold"
                  aria-hidden="true"
                >
                  {calendarSeason.emoji}
                </span>
                {calendarSeason.title}放送中...
              </Link>
            </h1>
          )}
          <div className="flex flex-wrap items-baseline gap-4">
            {latestSeason && (
              <Link
                {...getCalendarRouteLink(latestSeason)}
                className="text-link text-base"
                onClick={() => trackHomeCalendarClick({ season: latestSeason, source: 'link' })}
              >
                → 前往周历
              </Link>
            )}
            <Link to="/skills" className="text-link text-base">
              → 使用 Skills / MCP
            </Link>
          </div>
        </header>
        {ok ? (
          <>
            <Resources resources={resources} filter={filter}></Resources>
            {resources.length > 0 && pagination && !pagination.complete && filter && (
              <ResourcesLoadMoreLink filter={filter} />
            )}
          </>
        ) : (
          <Error
            tracking={{
              error: renderError
            }}
          ></Error>
        )}
      </div>
    </Layout>
  );
}
