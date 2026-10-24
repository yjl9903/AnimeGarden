import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
      poster: 'https://bgm.animes.garden/bangumi/subject/1/poster.jpeg?quality=large',
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

  afterEach(() => vi.useRealTimers());

  it('retains the last successful dynamic detail across repeated outages and retries', async () => {
    vi.useFakeTimers();
    fetchSubject.mockResolvedValueOnce({ subject: subject(700001) });
    const { getSubjectByIdResult } = await import('../src/query/subject.server');
    const first = await getSubjectByIdResult(700001);
    await vi.advanceTimersByTimeAsync(3_600_001);
    fetchSubject.mockRejectedValue(new Error('offline'));
    await expect(getSubjectByIdResult(700001)).resolves.toEqual(first);
    await expect(getSubjectByIdResult(700001)).resolves.toEqual(first);
    expect(fetchSubject).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(60_001);
    await expect(getSubjectByIdResult(700001)).resolves.toEqual(first);
    fetchSubject.mockResolvedValue({ subject: { ...subject(700001), title: 'Updated' } });
    await vi.advanceTimersByTimeAsync(60_001);
    await expect(getSubjectByIdResult(700001)).resolves.toMatchObject({
      subject: { title: 'Updated' }
    });
  });

  it('keeps recently refreshed details when the cache reaches its capacity', async () => {
    vi.useFakeTimers();
    fetchSubject.mockImplementation(async (id: number) => ({ subject: subject(id) }));
    const { getSubjectByIdResult } = await import('../src/query/subject.server');
    const first = await getSubjectByIdResult(1);
    await Promise.all(Array.from({ length: 1023 }, (_, index) => getSubjectByIdResult(index + 2)));

    await vi.advanceTimersByTimeAsync(3_600_001);
    await getSubjectByIdResult(1);
    await getSubjectByIdResult(1025);

    // Refreshing an expired entry counts as recent use, so another entry must be evicted.
    fetchSubject.mockRejectedValue(new Error('offline'));
    await vi.advanceTimersByTimeAsync(3_600_001);
    await expect(getSubjectByIdResult(1)).resolves.toEqual(first);
    await expect(getSubjectByIdResult(2)).rejects.toThrow('offline');
  });

  it('does not resurrect cached details after an authoritative 404', async () => {
    vi.useFakeTimers();
    fetchSubject.mockResolvedValueOnce({ subject: subject(700001) });
    const { getSubjectByIdResult } = await import('../src/query/subject.server');
    await getSubjectByIdResult(700001);
    await vi.advanceTimersByTimeAsync(3_600_001);
    fetchSubject.mockRejectedValue({ response: { status: 404 } });
    await expect(getSubjectByIdResult(700001)).resolves.toMatchObject({
      ok: false,
      code: 'NOT_FOUND'
    });
    await vi.advanceTimersByTimeAsync(3_600_001);
    fetchSubject.mockRejectedValue(new Error('offline'));
    await expect(getSubjectByIdResult(700001)).rejects.toThrow('offline');
  });

  it('reuses the latest successful calendar during outages', async () => {
    vi.useFakeTimers();
    fetchCalendar.mockResolvedValueOnce({ calendar: [[subject(1)]], web: [] });
    const { getCalendar } = await import('../src/query/subject.server');
    const first = await getCalendar('2026-10');
    await vi.advanceTimersByTimeAsync(3_600_001);
    fetchCalendar.mockRejectedValue(new Error('offline'));
    await expect(getCalendar('2026-10')).resolves.toEqual(first);
    await expect(getCalendar('2020-01')).rejects.toThrow('offline');
  });

  it('returns NOT_FOUND only when the upstream response is 404 without a static fallback', async () => {
    fetchSubject.mockRejectedValue(
      new Error('missing', {
        cause: { response: new Response(null, { status: 404 }) }
      })
    );
    const { getSubjectByIdResult } = await import('../src/query/subject.server');

    await expect(getSubjectByIdResult(999)).resolves.toEqual({
      ok: false,
      code: 'NOT_FOUND',
      subject: undefined
    });
  });

  it('preserves upstream failures without a last successful response', async () => {
    const upstreamError = new Error('offline');
    fetchSubject.mockRejectedValue(upstreamError);
    const { getSubjectByIdResult } = await import('../src/query/subject.server');

    await expect(getSubjectByIdResult(999)).rejects.toBe(upstreamError);
  });

  it('preserves the season WEB bucket after all seven weekdays', async () => {
    const web = subject(513878);
    web.bangumi.platform = 'WEB';
    fetchCalendar.mockResolvedValue({
      calendar: Array.from({ length: 7 }, (_, index) => (index === 0 ? [subject(1)] : [])),
      web: [web]
    });
    const { getCalendar } = await import('../src/query/subject.server');
    const result = await getCalendar('2026-10');
    expect(result).toHaveLength(8);
    expect(result[0][0].id).toBe(1);
    expect(result[7]).toMatchObject([{ id: 513878, platform: 'WEB' }]);
    expect(fetchCalendar).toHaveBeenCalledWith(expect.objectContaining({ seasons: ['2026-10'] }));
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
    expect(fetchCalendar).toHaveBeenCalledWith(expect.objectContaining({ seasons: ['2026-07'] }));
  });
});
