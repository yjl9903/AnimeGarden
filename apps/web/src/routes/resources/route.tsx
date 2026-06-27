import { Outlet, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/resources')({
  component: Outlet
});
