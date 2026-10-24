import { useEffect } from 'react';

import type { Resource } from '@animegarden/client';
import { Link } from '@tanstack/react-router';

import Layout from '~/layouts/Layout';
import Resources from '~/components/Resources';
import { getTrackingError, trackFetchResourcesError } from '~/utils';
import { getCalendarSeason } from '~/utils/calendar-season';
import { getCalendarRouteLink, getResourcesRouteLink } from '~/utils/routes';

import { Error } from '../resources.($page)/Error';
import '../anime/anime.css';

export interface IndexProps {
  data: {
    ok: boolean;
    resources: Resource<{ tracker: true }>[];
    timestamp?: Date;
    error: any;
  };
  feedURL: string;
  latestSeason?: string;
  path: string;
  renderError: string;
}

export default function Index({ data, feedURL, latestSeason, path, renderError }: IndexProps) {
  const { ok, resources, timestamp, error } = data;
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
              <Link {...getCalendarRouteLink(latestSeason)} className="text-link text-base">
                → 前往周历
              </Link>
            )}
            <Link to="/skills" className="text-link text-base">
              → 使用 Skills / MCP
            </Link>
          </div>
        </header>
        {ok ? (
          <Resources
            resources={resources}
            page={1}
            timestamp={new Date(timestamp!)}
            complete={false}
            link={(page) => getResourcesRouteLink(page, 'type=动画&type=合集&preset=bangumi')}
          ></Resources>
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
