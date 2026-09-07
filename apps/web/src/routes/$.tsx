import { createFileRoute } from '@tanstack/react-router';

import NotFoundPage, { buildNotFoundPageHeaders, throwNotFoundPage } from '~/pages/not-found/route';
import { buildNotFoundPageHead } from '~/pages/not-found/seo';

export const loader = async () => {
  throwNotFoundPage('page');
};

export const Route = createFileRoute('/$')({
  loader,
  head: buildNotFoundPageHead,
  headers: ({ match }) => buildNotFoundPageHeaders(match.error),
  notFoundComponent: NotFoundPage
});
