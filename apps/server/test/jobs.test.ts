import { describe, expect, it, vi } from 'vitest';

import { ScraperProviders } from '../src/providers';
import { patchResource, runFetchJob } from '../src/resources/jobs';

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

describe('manual resource subject patches', () => {
  function createSystem(result: unknown, subject: unknown = { id: 200 }) {
    const deleteRedisCache = vi.fn().mockResolvedValue(undefined);
    const forceRefreshByProviderId = vi.fn().mockResolvedValue(true);
    const notifyRefreshedResources = vi.fn().mockResolvedValue(undefined);
    const patchResourceMock = vi.fn().mockResolvedValue(result);
    const sys = {
      modules: {
        subjects: {
          getSubject: vi.fn().mockReturnValue(subject)
        },
        resources: {
          patchResource: patchResourceMock,
          details: { deleteRedisCache, forceRefreshByProviderId }
        }
      },
      notifyRefreshedResources
    } as any;

    return {
      sys,
      deleteRedisCache,
      forceRefreshByProviderId,
      notifyRefreshedResources,
      patchResourceMock
    };
  }

  it('broadcasts changed subject ids', async () => {
    const resource = {
      id: 1,
      provider: 'dmhy',
      providerId: '723509',
      title: 'resource',
      subjectId: 200
    } as const;
    const { sys, deleteRedisCache, forceRefreshByProviderId, notifyRefreshedResources } =
      createSystem({
        changed: true,
        previous: { subjectId: 100 },
        resource
      });

    const response = await patchResource(sys, {
      provider: 'dmhy',
      providerId: '723509',
      patch: { subjectId: 200 }
    });

    expect(response).toMatchObject({
      status: 'OK',
      changed: true,
      previous: { subjectId: 100 }
    });
    expect(deleteRedisCache).toHaveBeenCalledWith('dmhy', '723509');
    expect(forceRefreshByProviderId).not.toHaveBeenCalled();
    expect(notifyRefreshedResources).toHaveBeenCalledWith({
      resources: { inserted: [], updated: [resource], deleted: [] },
      duplicated: { attached: [], detached: [] }
    });
  });

  it('does not notify when the subject id is unchanged', async () => {
    const { sys, deleteRedisCache, forceRefreshByProviderId, notifyRefreshedResources } =
      createSystem({
        changed: false,
        previous: { subjectId: 200 },
        resource: {
          id: 1,
          provider: 'dmhy',
          providerId: '723509',
          title: 'resource',
          subjectId: 200
        }
      });

    const response = await patchResource(sys, {
      provider: 'dmhy',
      providerId: '723509',
      patch: { subjectId: 200 }
    });

    expect(response).toMatchObject({ status: 'OK', changed: false });
    expect(deleteRedisCache).not.toHaveBeenCalled();
    expect(forceRefreshByProviderId).not.toHaveBeenCalled();
    expect(notifyRefreshedResources).not.toHaveBeenCalled();
  });

  it('forces a detail refresh without publishing a resource notification', async () => {
    const { sys, deleteRedisCache, forceRefreshByProviderId, notifyRefreshedResources } =
      createSystem({
        changed: false,
        previous: { subjectId: 200 },
        resource: {
          id: 1,
          provider: 'dmhy',
          providerId: '723509',
          title: 'resource',
          subjectId: 200
        }
      });

    const response = await patchResource(sys, {
      provider: 'dmhy',
      providerId: '723509',
      patch: { detail: true }
    });

    expect(deleteRedisCache).toHaveBeenCalledWith('dmhy', '723509');
    expect(forceRefreshByProviderId).toHaveBeenCalledWith('dmhy', '723509');
    expect(notifyRefreshedResources).not.toHaveBeenCalled();
    expect(response).toMatchObject({
      status: 'OK',
      changed: false,
      detailRefreshed: true
    });
  });

  it('rejects unknown subjects before looking up the resource', async () => {
    const { sys, patchResourceMock } = createSystem(undefined, null);

    const response = await patchResource(sys, {
      provider: 'dmhy',
      providerId: '723509',
      patch: { subjectId: 999 }
    });

    expect(response).toMatchObject({ status: 'ERROR', code: 'SUBJECT_NOT_FOUND' });
    expect(patchResourceMock).not.toHaveBeenCalled();
  });

  it('reports an unknown resource without broadcasting', async () => {
    const { sys, notifyRefreshedResources } = createSystem(undefined);

    const response = await patchResource(sys, {
      provider: 'dmhy',
      providerId: 'missing',
      patch: { subjectId: 200 }
    });

    expect(response).toMatchObject({ status: 'ERROR', code: 'RESOURCE_NOT_FOUND' });
    expect(notifyRefreshedResources).not.toHaveBeenCalled();
  });
});
