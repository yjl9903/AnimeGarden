import { describe, expect, it, vi } from 'vitest';

import { parseAdminPatchArguments, requestAdminAPI } from '../src/manager/admin.ts';

describe('manager admin requests', () => {
  it('sends authorization and JSON content headers through fetchAPI options', async () => {
    const fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      expect(headers.get('authorization')).toBe('Bearer test-secret');
      expect(headers.get('content-type')).toBe('application/json');
      expect(init?.method).toBe('PATCH');
      expect(init?.body).toBe(JSON.stringify({ subjectId: 200 }));
      return new Response(JSON.stringify({ status: 'OK' }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    });

    await expect(
      requestAdminAPI(
        '/admin/resources/dmhy/723509',
        { method: 'PATCH', body: JSON.stringify({ subjectId: 200 }) },
        { secret: 'test-secret', url: 'http://localhost:8080', fetch: fetch as any }
      )
    ).resolves.toMatchObject({ status: 'OK' });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('validates and normalizes admin patch arguments', () => {
    expect(parseAdminPatchArguments('dmhy', ' 723509 ', '200')).toEqual({
      provider: 'dmhy',
      providerId: '723509',
      patch: { subjectId: 200 }
    });
    expect(parseAdminPatchArguments('dmhy', '723509', undefined, true)).toEqual({
      provider: 'dmhy',
      providerId: '723509',
      patch: { detail: true }
    });
    expect(parseAdminPatchArguments('dmhy', '723509', '200', true)).toEqual({
      provider: 'dmhy',
      providerId: '723509',
      patch: { subjectId: 200, detail: true }
    });

    expect(() => parseAdminPatchArguments('unknown', '1', '200')).toThrow(
      'Unsupported resource provider'
    );
    expect(() => parseAdminPatchArguments('dmhy', '', '200')).toThrow('<provider-id>');
    expect(() => parseAdminPatchArguments('dmhy', '1', '0')).toThrow('--subject');
    expect(() => parseAdminPatchArguments('dmhy', '1', undefined)).toThrow('--subject or --detail');
  });

  it('requires an admin secret', async () => {
    await expect(requestAdminAPI('/admin/resources/dmhy', { method: 'POST' }, {})).rejects.toThrow(
      '--secret'
    );
  });
});
