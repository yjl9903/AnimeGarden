import { redirect, type LoaderFunctionArgs } from '@remix-run/cloudflare';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // TODO: notification
  return redirect('/');
};
