import { describe, expect, it, vi } from 'vitest';

import { ScraperProviders } from '../src/providers';
import { runFetchJob } from '../src/resources/jobs';

describe('runFetchJob telegram push enqueueing', () => {
  it('enqueues inserted resources and failed telegram message retries after notifications', async () => {
    const previousProvider = ScraperProviders.get('dmhy');
    const fetchLatestResources = vi.fn().mockResolvedValue([
      {
        provider: 'dmhy',
        providerId: '1',
        title: '[ANi] test - 01 [1080P][Baha][WEB-DL][AAC AVC][CHT][MP4]',
        href: '1',
        type: '动画',
        magnet: 'magnet:?xt=urn:btih:0123456789012345678901234567890123456789',
        tracker: '',
        size: 1024,
        createdAt: '2026-05-07T05:00:00.000Z',
        publisher: {
          id: '1',
          name: 'ANi'
        },
        fansub: {
          id: '1',
          name: 'ANi'
        }
      }
    ]);
    ScraperProviders.set('dmhy', { fetchLatestResources } as any);

    const enqueueResourceMessages = vi.fn();
    const enqueueFailedResourceMessages = vi.fn().mockResolvedValue(undefined);
    const notifyRefreshedResources = vi.fn().mockResolvedValue(undefined);
    const sys = {
      logger: {
        info: vi.fn(),
        success: vi.fn(),
        error: vi.fn()
      },
      modules: {
        resources: {
          upsertResources: vi.fn().mockResolvedValue({
            inserted: [
              {
                id: 11,
                provider: 'dmhy',
                providerId: '1',
                title: 'test'
              }
            ],
            updated: [
              {
                id: 12,
                provider: 'dmhy',
                providerId: '2',
                title: 'updated'
              }
            ],
            changed: [11, 12],
            errors: []
          }),
          maintainDuplicatedResources: vi.fn().mockResolvedValue({
            attached: [],
            detached: []
          })
        },
        providers: {
          updateRefreshTimestamp: vi.fn().mockResolvedValue(undefined),
          updateActiveStatus: vi.fn().mockResolvedValue(undefined)
        },
        push: {
          enqueueResourceMessages,
          enqueueFailedResourceMessages
        }
      },
      notifyRefreshedResources
    };

    try {
      await runFetchJob(sys as any, 'dmhy');

      expect(notifyRefreshedResources).toHaveBeenCalledOnce();
      expect(enqueueResourceMessages).toHaveBeenCalledWith([11]);
      expect(enqueueResourceMessages).not.toHaveBeenCalledWith([12]);
      expect(enqueueFailedResourceMessages).toHaveBeenCalledOnce();
    } finally {
      if (previousProvider) {
        ScraperProviders.set('dmhy', previousProvider);
      }
    }
  });
});
