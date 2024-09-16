import { redirect, type LoaderFunctionArgs } from '@remix-run/cloudflare';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  if (url.pathname.endsWith('/')) {
    url.pathname += '1';
  } else {
    url.pathname += '/1';
  }
  return redirect(url.toString());
};
