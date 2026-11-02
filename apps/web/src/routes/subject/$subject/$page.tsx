import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/subject/$subject/$page')({
  // Preserve published links without loading the Subject overview at the obsolete URL.
  beforeLoad: ({ location, params }) => {
    throw redirect({
      href: `/subject/${encodeURIComponent(params.subject!)}${location.searchStr}`,
      statusCode: 308,
      replace: true
    });
  }
});
