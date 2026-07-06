import { describe, expect, it, vi } from 'vitest';

const { fetchCalendar, fetchSubjects } = vi.hoisted(() => ({
  fetchCalendar: vi.fn(),
  fetchSubjects: vi.fn()
}));

vi.mock('bgmx', () => ({
  fetchCalendar,
  fetchSubjects
}));

import { SubjectsModule } from '../src/subjects';
import { updateCalendar } from '../src/subjects/bgmd';

function bgmxSubject(id: number, include = ['日文标题']) {
  return {
    id,
    title: '日文标题',
    alias: {
      ja: ['日文标题'],
      zh: ['中文标题']
    },
    poster: '',
    onair_date: null,
    search: { include },
    bangumi: {
      date: '2026-07-01',
      platform: 'TV',
      images: { large: 'poster.jpg' },
      summary: 'summary',
      meta_tags: ['TV'],
      tags: ['动画']
    }
  };
}

describe('SubjectsModule telegram push enqueueing', () => {
  it('enqueues resources newly bound while inserting subjects', async () => {
    const enqueueResourceMessages = vi.fn();
    const mod = new SubjectsModule(
      {
        modules: {
          push: {
            enqueueResourceMessages
          }
        }
      } as any,
      SubjectsModule.name
    );

    vi.spyOn(mod, 'insertSubject')
      .mockResolvedValueOnce({
        id: 1,
        name: 'subject-1',
        matched: [
          { id: 11, title: 'resource-11' },
          { id: 12, title: 'resource-12' }
        ]
      })
      .mockResolvedValueOnce({
        id: 2,
        name: 'subject-2',
        matched: [
          { id: 12, title: 'resource-12 duplicated' },
          { id: 13, title: 'resource-13' }
        ]
      });

    const resp = await mod.insertSubjects(
      [
        {
          id: 1,
          name: 'subject-1',
          keywords: ['subject-1'],
          activedAt: new Date('2026-05-08T00:00:00.000Z')
        },
        {
          id: 2,
          name: 'subject-2',
          keywords: ['subject-2'],
          activedAt: new Date('2026-05-08T00:00:00.000Z')
        }
      ],
      {
        indexResources: true,
        pushTelegramMessage: true
      }
    );

    expect(resp.inserted).toEqual([
      { id: 1, name: 'subject-1' },
      { id: 2, name: 'subject-2' }
    ]);
    expect(enqueueResourceMessages).toHaveBeenCalledOnce();
    expect(enqueueResourceMessages).toHaveBeenCalledWith([11, 12, 13]);
  });

  it('does not enqueue indexed resources when telegram push is disabled', async () => {
    const enqueueResourceMessages = vi.fn();
    const mod = new SubjectsModule(
      {
        modules: {
          push: {
            enqueueResourceMessages
          }
        }
      } as any,
      SubjectsModule.name
    );

    vi.spyOn(mod, 'insertSubject').mockResolvedValueOnce({
      id: 1,
      name: 'subject-1',
      matched: [{ id: 11, title: 'resource-11' }]
    });

    await mod.insertSubjects(
      [
        {
          id: 1,
          name: 'subject-1',
          keywords: ['subject-1'],
          activedAt: new Date('2026-05-08T00:00:00.000Z')
        }
      ],
      {
        indexResources: true
      }
    );

    expect(enqueueResourceMessages).not.toHaveBeenCalled();
  });
});

describe('SubjectsModule bgmx calendar sync', () => {
  it('imports bgmx calendar with Chinese name and searchable keywords', async () => {
    fetchCalendar.mockResolvedValueOnce({ calendar: [[bgmxSubject(1)]], web: [] });
    const enqueueResourceMessages = vi.fn();
    const mod = {
      activeSubjects: [],
      archiveSubjects: vi.fn(async () => []),
      insertSubject: vi.fn(async (subject) => ({
        id: subject.id,
        name: subject.name,
        matched: [{ id: 11, title: 'resource-11' }]
      })),
      fetchSubjects: vi.fn(),
      system: {
        modules: {
          push: {
            enqueueResourceMessages
          }
        },
        logger: {
          warn: vi.fn()
        }
      }
    } as any;

    const resp = await updateCalendar(mod);

    expect(resp.inserted).toEqual([{ id: 1, name: '中文标题' }]);
    expect(mod.insertSubject).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 1,
        name: '中文标题',
        keywords: ['中文标题', '日文标题']
      }),
      expect.objectContaining({ indexResources: true, overwrite: false })
    );
    expect(enqueueResourceMessages).toHaveBeenCalledWith([11]);
  });

  it('indexes existing active subjects only when search conditions changed', async () => {
    fetchCalendar.mockResolvedValueOnce({ calendar: [[bgmxSubject(1)]], web: [] });
    const mod = {
      activeSubjects: [
        {
          id: 1,
          name: '中文标题',
          keywords: ['中文标题', '日文标题'],
          activedAt: new Date('2026-06-30T16:00:00.000Z'),
          isArchived: false
        }
      ],
      archiveSubjects: vi.fn(async () => []),
      insertSubject: vi.fn(async (subject) => ({
        id: subject.id,
        name: subject.name,
        matched: []
      })),
      fetchSubjects: vi.fn(),
      system: {
        modules: { push: { enqueueResourceMessages: vi.fn() } },
        logger: { warn: vi.fn() }
      }
    } as any;

    await updateCalendar(mod);

    expect(mod.insertSubject).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ indexResources: false })
    );

    fetchCalendar.mockResolvedValueOnce({
      calendar: [[bgmxSubject(1, ['日文标题', '新标题'])]],
      web: []
    });
    await updateCalendar(mod);

    expect(mod.insertSubject).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ indexResources: true })
    );
  });

  it('does not fallback when bgmx calendar fails', async () => {
    fetchCalendar.mockRejectedValueOnce(new Error('offline'));

    await expect(updateCalendar({} as any)).rejects.toThrow('offline');
  });
});
