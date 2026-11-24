import { renderToStaticMarkup } from 'react-dom/server';
import type { QueryClient } from '@tanstack/react-query';
import { expect, it, vi } from 'vitest';

import { ResourceDetailLink } from '../src/components/Resources/ResourceDetailLink';
import { loader } from '../src/routes/detail/$provider/$providerId/route';
import { handleMarkdownRequest } from '../src/markdown/index.server';
import { resourceLink } from '../src/markdown/shared.server';
import { handleSitemapIndexRequest, handleSitemapRequest } from '../src/sitemap/index.server';

vi.mock(import('../src/utils/constants'), async (original) => ({
  ...(await original()),
  RESOURCE_DETAIL_PAGES_ENABLED: false
}));

const resource = { provider: 'dmhy', providerId: '716882' };
const request = (path: string) => new Request('https://animes.garden' + path);

it('returns 404 for bookmarked HTML and Markdown details', async () => {
  const queryClient = { ensureQueryData: vi.fn() };
  await expect(
    loader({ context: { queryClient: queryClient as unknown as QueryClient }, params: resource })
  ).rejects.toMatchObject({ isNotFound: true, headers: { 'Cache-Control': 'no-store' } });
  expect(queryClient.ensureQueryData).not.toHaveBeenCalled();
  expect((await handleMarkdownRequest(request('/detail/dmhy/716882'))).status).toBe(404);
});

it('renders labels as text and omits the standalone detail action', () => {
  expect(
    renderToStaticMarkup(<ResourceDetailLink resource={resource}>标题</ResourceDetailLink>)
  ).toBe('标题');
  expect(
    renderToStaticMarkup(
      <ResourceDetailLink resource={resource} hideWhenUnavailable>
        详情
      </ResourceDetailLink>
    )
  ).toBe('');
  expect(resourceLink('标题', resource)).toBe('标题');
});

it('removes monthly sitemaps from the index and rejects old shard URLs', async () => {
  const index = await handleSitemapIndexRequest(request('/sitemap-index.xml'));
  expect(await index.text()).not.toMatch(/sitemap-\d{4}-\d{2}\.xml/);
  expect((await handleSitemapRequest(request('/sitemap-2020-01.xml'))).status).toBe(404);
});
