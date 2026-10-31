import { getRssString, type RSSOptions } from '../../feed/rss/index.ts';

export * from '../../feed/rss/index.ts';

/** Adapt the content serializer to the existing HTTP response helper. */
export async function getRssResponse(rssOptions: RSSOptions): Promise<Response> {
  const rssString = await getRssString(rssOptions);
  return new Response(rssString, {
    headers: {
      'Content-Type': 'application/xml'
    }
  });
}
