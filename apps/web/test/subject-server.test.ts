import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchSubject, fetchCalendar, fetchCalendars, fetchSubjects } = vi.hoisted(() => ({
  fetchSubject: vi.fn(),
  fetchCalendar: vi.fn(),
  fetchCalendars: vi.fn(),
  fetchSubjects: vi.fn()
}));

vi.mock('bgmx/client', () => ({
  fetchSubject,
  fetchCalendar,
  fetchCalendars,
  fetchSubjects
}));

vi.mock('bgmd/full', () => ({
  default: {
    subjects: [
      {
        id: 2,
        title: 'Fallback Title',
        platform: 'TV',
        onair_date: '2026-01-01',
        poster: 'fallback.jpg',
        summary: 'Fallback summary',
        alias: ['Fallback Alias'],
        tags: [],
        search: { include: ['Fallback Title'] }
      }
    ]
  }
}));

function subject(id = 1) {
  return {
    id,
    title: '上伊那ぼたん、酔へる姿は百合の花',
    alias: {
      ja: ['上伊那ぼたん、酔へる姿は百合の花'],
      zh: ['上伊那牡丹，酒醉身姿似百合花般']
    },
    poster: '',
    onair_date: null,
    search: { include: ['上伊那ぼたん、酔へる姿は百合の花'] },
    bangumi: {
      platform: 'TV',
      date: '2026-04-10',
      images: { large: 'poster.jpg' },
      summary: 'summary',
      meta_tags: ['TV'],
      tags: ['百合']
    }
  };
}

async function* subjects(values: any[]) {
  for (const value of values) {
    yield value;
  }
}

describe('subject.server BGM client', () => {
  beforeEach(() => {
    vi.resetModules();
    fetchSubject.mockReset();
    fetchCalendar.mockReset();
    fetchCalendars.mockReset();
    fetchSubjects.mockReset();
  });

  it('transforms bgmx subjects with display_title and minimal fields', async () => {
    fetchSubject.mockResolvedValue({ subject: subject() });
    const { getSubjectById } = await import('../src/query/subject.server');

    const result = await getSubjectById(1);

    expect(result).toMatchObject({
      id: 1,
      title: '上伊那ぼたん、酔へる姿は百合の花',
      display_title: '上伊那牡丹，酒醉身姿似百合花般',
      onair_date: '2026-04-10',
      poster: 'poster.jpg',
      tags: ['TV', '百合'],
      search: { include: ['上伊那ぼたん、酔へる姿は百合の花'] }
    });
    expect(result).not.toHaveProperty('images');
    expect(result).not.toHaveProperty('rating');
  });

  it('searches with bgmx q and reuses keyword cache across limits', async () => {
    fetchSubjects.mockImplementation(() => subjects([subject(1), subject(2)]));
    const { searchSubjects } = await import('../src/query/subject.server');

    await expect(searchSubjects('上伊那', 1)).resolves.toHaveLength(1);
    await expect(searchSubjects('上伊那')).resolves.toHaveLength(2);

    expect(fetchSubjects).toHaveBeenCalledTimes(1);
    expect(fetchSubjects).toHaveBeenCalledWith(
      expect.objectContaining({
        q: '上伊那'
      })
    );
  });

  it('caps bgmx subject searches at 100 results', async () => {
    let yielded = 0;
    fetchSubjects.mockImplementation(async function* () {
      for (let id = 1; id <= 101; id++) {
        yielded++;
        yield subject(id);
      }
    });
    const { searchSubjects } = await import('../src/query/subject.server');

    await expect(searchSubjects('上伊那')).resolves.toHaveLength(100);
    expect(yielded).toBe(100);
  });

  it('resolves subject names without a fixed result limit', async () => {
    fetchSubjects.mockImplementation(() => subjects([subject(1)]));
    const { resolveSubjectByName } = await import('../src/query/subject.server');

    await expect(resolveSubjectByName('上伊那牡丹，酒醉身姿似百合花般')).resolves.toMatchObject({
      id: 1
    });
  });

  it('falls back to bgmd/full only for subject detail failures', async () => {
    fetchSubject.mockRejectedValue(new Error('offline'));
    const { getSubjectById } = await import('../src/query/subject.server');

    await expect(getSubjectById(2)).resolves.toMatchObject({
      id: 2,
      title: 'Fallback Title'
    });
  });

  it('does not fallback calendar failures', async () => {
    fetchCalendar.mockRejectedValue(new Error('offline'));
    const { getCalendar } = await import('../src/query/subject.server');

    await expect(getCalendar('2026-07')).rejects.toThrow('offline');
  });

  it('uses the latest active calendar season', async () => {
    fetchCalendars.mockResolvedValue([
      { season: '2026-10', is_active: false, updated_at: new Date('2026-07-01') },
      { season: '2026-07', is_active: true, updated_at: new Date('2026-07-01') }
    ]);
    fetchCalendar.mockResolvedValue({ calendar: [[subject(1)]], web: [] });
    const { getLatestCalendar } = await import('../src/query/subject.server');

    await expect(getLatestCalendar()).resolves.toMatchObject({ season: '2026-07' });
    expect(fetchCalendar).toHaveBeenCalledWith(
      expect.objectContaining({ seasons: ['2026-07'] })
    );
  });
});
