import { describe, it, expect } from 'vitest';

import { fetchStatus } from '../src/api/status';
// import { fetchResources } from '../src/api/resources';
// import { fetchCollection } from '../src/api/collection';

const timeout = 30 * 1000;

describe('API', () => {
  it('should fetch status', { timeout }, async () => {
    const resp = await fetchStatus({});
    expect(resp.ok).toBe(true);
    expect(resp.timestamp).toBeTruthy();
    expect(resp.providers).toBeTruthy();
  });

  // it('should fetch collection', { timeout }, async () => {
  //   const resp = await fetchCollection('NxRs-dGspGeA1gr6CrUl81qppmC0J4wcSl9tCxrt1tM');
  //   expect(resp!.ok).toBe(true);
  //   expect(resp!.timestamp).toBeTruthy();
  // });

  // it('should fetch resources', { timeout }, async () => {
  //   const resp = await fetchResources({
  //     subject: 363957,
  //     after: new Date(1743350400000)
  //   });
  //   expect(resp.ok).toBe(true);
  //   expect(resp.timestamp).toBeTruthy();
  //   expect(resp.filter!.subjects).toStrictEqual([363957]);
  //   expect(resp.resources.length > 0).toBeTruthy();
  // });

  it('should handle timeout', { timeout }, async () => {
    const now = new Date();

    expect(
      await fetchStatus({
        retry: 5,
        timeout: 1
      })
    ).toMatchInlineSnapshot(`
      {
        "ok": false,
        "providers": undefined,
        "timestamp": undefined,
      }
    `);

    expect(new Date().getTime() - now.getTime()).greaterThanOrEqual(500);
  });

  it('should handle abort', { timeout }, async () => {
    const now = new Date();
    const abort = new AbortController();
    setTimeout(() => abort.abort());

    expect(
      await fetchStatus({
        retry: 5,
        signal: abort.signal
      })
    ).toMatchInlineSnapshot(`
      {
        "ok": false,
        "providers": undefined,
        "timestamp": undefined,
      }
    `);

    expect(new Date().getTime() - now.getTime()).lessThanOrEqual(100);
  });
});
