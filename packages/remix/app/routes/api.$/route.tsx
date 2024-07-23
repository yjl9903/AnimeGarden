import { type LoaderFunctionArgs, json, } from "@remix-run/node";

import { SERVER_URL as RAW_SERVER_URL } from '~build/meta';


const SERVER_URL = new URL(RAW_SERVER_URL);

export async function loader({
  request
}: LoaderFunctionArgs) {
  const url = mergeURL(request.url);

  try {
    const subRequest = new Request(url, request.clone());
    const response = await fetch(subRequest);

    const body = await response.text();
    const headers = cloneHeaders(response.headers);

    return new Response(body, { headers });
  } catch (error) {
    console.error(error);
    return json({ status: 500, detail: { message: (error as any)?.message ?? 'unknown' } }, { status: 500 })
  }
}

function mergeURL(request: string) {
  const url = new URL(SERVER_URL.toString());
  const requestURL = new URL(request);
  url.pathname += requestURL.pathname.slice('/api/'.length);
  return url;
}

const PassHeaders = new Set([
  'access-control-allow-headers',
  'access-control-allow-methods',
  'access-control-allow-origin',
  'cache-control',
  'content-type',
]);
function cloneHeaders(headers: Headers) {
  return new Headers([...headers.entries()].filter(([key]) => PassHeaders.has(key)))
}