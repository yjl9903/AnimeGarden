import { describe, expect, it, vi } from 'vitest';

import { SubjectsModule } from '../src/subjects';

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
