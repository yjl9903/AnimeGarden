import { describe, expect, it, vi } from 'vitest';

import { DetailsManager } from '../src/resources/details.ts';

describe('DetailsManager Redis cache', () => {
  it('restores resource dates before transforming a cached detail', async () => {
    const createdAt = '2026-07-26T12:00:00.000Z';
    const fetchedAt = '2026-07-26T12:30:00.000Z';
    const detailFetchedAt = '2026-07-26T13:00:00.000Z';
    const get = vi.fn(async () =>
      JSON.stringify({
        resource: {
          id: 1,
          provider: 'dmhy',
          providerId: '723509',
          title: 'cached resource',
          href: 'https://share.dmhy.org/topics/view/723509',
          type: '动画',
          magnet: '',
          tracker: '',
          size: 0,
          createdAt,
          fetchedAt,
          publisherId: 1,
          fansubId: null,
          subjectId: null,
          isDeleted: false,
          duplicatedId: null,
          metadata: null
        },
        detail: {
          id: 1,
          description: '',
          magnets: [],
          files: [],
          hasMoreFiles: false,
          fetchedAt: detailFetchedAt
        },
        isDeleted: false
      })
    );
    const transform = vi.fn(async (resource) => ({
      createdAt: resource.createdAt.toISOString(),
      fetchedAt: resource.fetchedAt.toISOString()
    }));
    const logger = {
      withTag: vi.fn(() => logger)
    };
    const manager = new DetailsManager(
      {
        publisherRedis: { get },
        database: {
          select: vi.fn(() => {
            throw new Error('database should not be queried on a cache hit');
          })
        },
        modules: {
          resources: {
            query: { transform }
          }
        }
      } as any,
      logger as any
    );
    const scrape = vi.fn();

    const result = await manager.getByProviderId('dmhy', '723509', scrape);

    expect(get).toHaveBeenCalledWith('details:dmhy:723509');
    expect(scrape).not.toHaveBeenCalled();
    expect(transform).toHaveBeenCalledWith(
      expect.objectContaining({
        createdAt: new Date(createdAt),
        fetchedAt: new Date(fetchedAt)
      })
    );
    expect(result.resource).toEqual({ createdAt, fetchedAt });
    expect(result.detail?.fetchedAt).toEqual(new Date(detailFetchedAt));
  });
});
