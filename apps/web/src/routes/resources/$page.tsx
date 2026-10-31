import { createFileRoute, redirect } from '@tanstack/react-router';

import { getResourcesRouteLink } from '~/utils/routes';

export const loader = ({ location }: { location: { searchStr: string } }) => {
  throw redirect({
    ...getResourcesRouteLink(location.searchStr),
    statusCode: 308,
    replace: true
  });
};

export const Route = createFileRoute('/resources/$page')({ loader });
