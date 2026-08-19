import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/resources/')({
  loader: ({ location }) => {
    throw redirect({ href: `/resources/1${location.searchStr}` });
  }
});
