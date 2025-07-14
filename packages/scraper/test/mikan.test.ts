import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

import { parseTimeString } from '../src/mikan/utils';


describe('parse mikan time string with TZ=UTC', () => {
  beforeAll(() => {
    vi.stubEnv('TZ', 'UTC');
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-07-13T00:00:00.000Z'));
  });

  afterAll(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it('should parse today time string', () => {
    const timeStr = '今天 13:53';
    const time = parseTimeString(timeStr);
    expect(time).toBe('2025-07-13T05:53:00.000Z');
  });

  it('should parse yesterday time string', () => {
    const timeStr = '昨天 13:53';
    const time = parseTimeString(timeStr);
    expect(time).toBe('2025-07-12T05:53:00.000Z');
  });

  it('should parse any time string', () => {
    const timeStr = '2025/07/13 23:53';
    const time = parseTimeString(timeStr);
    expect(time).toBe('2025-07-13T15:53:00.000Z');
  });
});

describe('parse mikan time string', () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-07-13T00:00:00.000Z'));
  });

  afterAll(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it('should parse today time string', () => {
    const timeStr = '今天 13:53';
    const time = parseTimeString(timeStr);
    expect(time).toBe('2025-07-13T05:53:00.000Z');
  });

  it('should parse yesterday time string', () => {
    const timeStr = '昨天 13:53';
    const time = parseTimeString(timeStr);
    expect(time).toBe('2025-07-12T05:53:00.000Z');
  });

  it('should parse any time string', () => {
    const timeStr = '2025/07/13 23:53';
    const time = parseTimeString(timeStr);
    expect(time).toBe('2025-07-13T15:53:00.000Z');
  });
});

describe('parse mikan time string when cross month', () => {
  beforeAll(() => {
    vi.stubEnv('TZ', 'UTC');
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-07-01T00:00:00.000Z'));
  });

  afterAll(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it('should parse today time string', () => {
    const timeStr = '今天 13:53';
    const time = parseTimeString(timeStr);
    expect(time).toBe('2025-07-01T05:53:00.000Z');
  });

  it('should parse yesterday time string', () => {
    const timeStr = '昨天 13:53';
    const time = parseTimeString(timeStr);
    expect(time).toBe('2025-06-30T05:53:00.000Z');
  });
});

