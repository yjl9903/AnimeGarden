import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/subject/$subject/$page')({
  loader: ({ location, params }) => {
    throw redirect({ href: `/subject/${params.subject}${location.searchStr}` });
  }
});
