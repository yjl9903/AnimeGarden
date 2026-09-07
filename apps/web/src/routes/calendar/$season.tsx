import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useSuspenseQuery, type QueryClient } from '@tanstack/react-query';

import Page from '~/pages/anime/route';
import { buildAnimePageHead } from '~/pages/anime/seo';
import NotFoundPage, { buildNotFoundPageHeaders, throwNotFoundPage } from '~/pages/not-found/route';
import { buildNotFoundPageHead } from '~/pages/not-found/seo';
import { calendarQueryOptions, calendarsQueryOptions, timestampQueryOptions } from '~/query';
import { ResponseCacheControl, setCacheControl, setErrorResponse } from '~/utils/response';

export const loader = async ({
  context,
  params
}: {
  context: { queryClient: QueryClient };
  params: { season: string };
}) => {
  const [timestamp, calendars] = await Promise.all([
    context.queryClient.ensureQueryData(timestampQueryOptions()),
    context.queryClient.ensureQueryData(calendarsQueryOptions())
  ]);
  const season = calendars.calendars.find((calendar) => calendar.season === params.season)?.season;

  if (!calendars.ok) {
    await setErrorResponse(500);
    return {
      ...timestamp,
      calendar: [],
      calendars: [],
      season: params.season
    };
  }

  if (!season) {
    throwNotFoundPage('calendar');
  }

  const calendar = await context.queryClient.ensureQueryData(calendarQueryOptions(season));

  if (timestamp.ok && calendars.ok && calendar.ok) {
    await setCacheControl(ResponseCacheControl.Calendar);
  } else {
    await setErrorResponse(500);
  }

  return {
    ...timestamp,
    calendar: calendar.calendar,
    calendars: calendars.calendars,
    season: calendar.season ?? season
  };
};

export const Route = createFileRoute('/calendar/$season')({
  loader,
  head: ({ loaderData, params }) =>
    loaderData ? buildAnimePageHead(loaderData.season ?? params.season) : buildNotFoundPageHead(),
  headers: ({ match }) => buildNotFoundPageHeaders(match.error),
  notFoundComponent: NotFoundPage,
  component: CalendarRoute
});

function CalendarRoute() {
  const navigate = useNavigate();
  const { season } = Route.useParams();
  const { data: timestamp } = useSuspenseQuery(timestampQueryOptions());
  const { data: calendars } = useSuspenseQuery(calendarsQueryOptions());
  const { data: calendar } = useSuspenseQuery(calendarQueryOptions(season));

  return (
    <Page
      timestamp={timestamp.timestamp}
      calendar={calendar.calendar}
      calendars={calendars.calendars}
      season={calendar.season}
      onSeasonChange={(nextSeason) =>
        navigate({ to: '/calendar/$season', params: { season: nextSeason } })
      }
    />
  );
}
