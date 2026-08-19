import { describe, expect, it, vi } from 'vitest';

import { ResourcesModule, shouldOverwriteSubjectId } from '../src/resources';

describe('resource subject id upsert policy', () => {
  it('preserves an existing subject id when re-indexing has no match by default', () => {
    expect(shouldOverwriteSubjectId(123, null)).toBe(false);
    expect(shouldOverwriteSubjectId(123, undefined)).toBe(false);
  });

  it('allows an existing subject id to be cleared when explicitly requested', () => {
    expect(shouldOverwriteSubjectId(123, null, true)).toBe(true);
    expect(shouldOverwriteSubjectId(123, undefined, true)).toBe(false);
  });

  it('still writes newly matched and changed subject ids', () => {
    expect(shouldOverwriteSubjectId(null, 123)).toBe(true);
    expect(shouldOverwriteSubjectId(123, 456)).toBe(true);
    expect(shouldOverwriteSubjectId(123, 123)).toBe(false);
  });
});

describe('manual resource subject patches', () => {
  function createModule(subjectId: number | null) {
    const set = vi.fn();
    const returning = vi.fn().mockResolvedValue([
      {
        id: 1,
        provider: 'dmhy',
        providerId: '723509',
        title: 'resource'
      }
    ]);
    set.mockReturnValue({ where: vi.fn().mockReturnValue({ returning }) });

    const database = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              id: 1,
              provider: 'dmhy',
              providerId: '723509',
              title: 'resource',
              subjectId
            }
          ])
        })
      }),
      update: vi.fn().mockReturnValue({ set })
    };
    const module = new ResourcesModule({ database, options: {} } as any);

    return { module, database, set };
  }

  it('updates only the subject id and reports the previous value', async () => {
    const { module, set } = createModule(100);

    const result = await module.patchResource('dmhy', '723509', { subjectId: 200 });

    expect(set).toHaveBeenCalledWith({ subjectId: 200 });
    expect(result).toMatchObject({
      changed: true,
      previous: { subjectId: 100 },
      resource: { providerId: '723509', subjectId: 200 }
    });
  });

  it('does not issue an update when the subject id is unchanged', async () => {
    const { module, database } = createModule(200);

    const result = await module.patchResource('dmhy', '723509', { subjectId: 200 });

    expect(database.update).not.toHaveBeenCalled();
    expect(result).toMatchObject({ changed: false, previous: { subjectId: 200 } });
  });

  it('looks up the resource without updating subject id for a detail-only patch', async () => {
    const { module, database } = createModule(null);

    const result = await module.patchResource('dmhy', '723509', { detail: true });

    expect(database.update).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      changed: false,
      previous: { subjectId: null },
      resource: { subjectId: null }
    });
  });
});
