import { describe, expect, it } from 'vitest';

import {
  getResourcesRouteLink,
  toResourceRefineRouterSearch,
  toResourcesRouterSearch
} from '../src/utils/routes';

describe('resources route links', () => {
  it('inherits only supported resource search params', () => {
    expect(
      toResourcesRouterSearch(
        '?fansub=ANi&xt=urn%3Abtih%3ALLL57QPCVEIPNF2MJLHKP6CX3MSMDYCC&type=动画&limit=40'
      )
    ).toEqual({
      fansub: 'ANi',
      type: '动画'
    });
  });

  it('removes cursor pagination state from object-based resource links', () => {
    const search = toResourcesRouterSearch({
      type: '动画',
      cursor: 'next',
      limit: '1',
      anchor: '2026-07-01T00:00:00.000Z'
    });

    expect(search).toEqual({ type: '动画' });
    expect(Object.keys(search)).toEqual(['type']);
  });

  it('filters raw search strings passed to resources links', () => {
    expect(getResourcesRouteLink('?fansub=ANi&xt=bad')).toMatchObject({
      search: { fansub: 'ANi' }
    });
  });

  it('refines links from the server-resolved filter', () => {
    expect(
      toResourceRefineRouterSearch(
        {
          types: ['动画', '合集'],
          subjects: [123],
          fansubs: ['server-resolved']
        },
        { fansub: 'ANi' }
      )
    ).toEqual({
      fansub: 'ANi',
      subject: '123',
      type: ['动画', '合集']
    });
  });

  it('does not freeze a version into in-page navigation links', () => {
    expect(getResourcesRouteLink({ fansub: 'ANi' })).toEqual({
      to: '/resources',
      search: { fansub: 'ANi' }
    });
  });

  it('keeps resource links direct when no displayed anchor is provided', () => {
    expect(getResourcesRouteLink({ fansub: 'ANi' })).not.toHaveProperty('state');
  });
});
