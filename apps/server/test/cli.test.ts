import { describe, expect, it, vi } from 'vitest';

// Load the real command declarations without running the process entrypoint or services.
vi.mock('breadc', async (importOriginal) => {
  const original = await importOriginal<typeof import('breadc')>();
  return {
    ...original,
    breadc: (...args: Parameters<typeof original.breadc>) => {
      const app = original.breadc(...args);
      vi.spyOn(app, 'run').mockResolvedValueOnce(undefined);
      return app;
    }
  };
});
vi.mock('undici', () => ({
  EnvHttpProxyAgent: class {},
  setGlobalDispatcher: vi.fn()
}));
vi.mock('../src/server/index.ts', () => ({}));
vi.mock('../src/system/index.ts', () => ({}));

import { app } from '../src/cli.ts';

describe('manager CLI argument parsing', () => {
  it.each(['dmhy', 'moe', 'mikan'])(
    'preserves fetch %s defaults and numeric overrides',
    (provider) => {
      expect(app.parse(['fetch', provider]).options).toMatchObject({ start: 1, retry: 5 });
      expect(app.parse(['fetch', provider, '--start', '3', '--retry', '0']).options).toMatchObject({
        start: 3,
        retry: 0
      });
    }
  );

  it.each(['dmhy', 'moe', 'mikan', 'ani'])('preserves detail %s retry defaults', (provider) => {
    expect(app.parse(['detail', provider, 'example']).options).toMatchObject({ retry: 5 });
  });

  it('preserves import batch defaults and optional page bounds', () => {
    expect(app.parse(['import', 'resources', './output']).options).toMatchObject({
      batchSize: 10,
      start: undefined,
      end: undefined
    });
    expect(
      app.parse([
        'import',
        'resources',
        './output',
        '--batch-size',
        '20',
        '--start',
        '2',
        '--end',
        '4'
      ]).options
    ).toMatchObject({ batchSize: 20, start: 2, end: 4 });
  });

  it('supports default and explicit cron switches', () => {
    expect(app.parse(['cron']).options).toMatchObject({ listen: true, import: true });
    expect(app.parse(['cron', '--no-listen', '--no-import']).options).toMatchObject({
      listen: false,
      import: false
    });
    expect(app.parse(['cron', '--listen=false', '--import=false']).options).toMatchObject({
      listen: false,
      import: false
    });
  });

  it('collects complete resource keys and subject IDs across repeated options', () => {
    expect(
      app.parse([
        'telegram',
        'push',
        '--resource',
        'dmhy:123',
        'moe/456',
        '--resource=ani:789',
        '--subject',
        '100',
        '200',
        '--force'
      ]).options
    ).toMatchObject({
      resource: ['dmhy:123', 'moe/456', 'ani:789'],
      subject: ['100', '200'],
      force: true
    });
    expect(app.parse(['telegram', 'push']).options).toMatchObject({ resource: [], subject: [] });
  });

  it.each([
    ['fetch', 'dmhy', '--retry'],
    ['telegram', 'push', '--resource'],
    ['telegram', 'push', '--subject'],
    ['cron', '--typo']
  ])('rejects incomplete or unknown input: %j', (...args) => {
    expect(() => app.parse(args)).toThrow();
  });
});
