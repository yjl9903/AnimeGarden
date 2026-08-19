import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';

import { defineAdminRoutes } from '../src/server/routes/admin';
import type { AppEnv } from '../src/server/utils/hono';

function createApp(invoke = vi.fn()) {
  const app = new Hono<AppEnv>();
  const sys = {
    secret: 'test-secret',
    rpc: {
      invoke
    },
    modules: {
      providers: {
        fetchProviders: vi.fn().mockResolvedValue(new Map())
      }
    }
  } as any;

  defineAdminRoutes(sys, app);

  return { app, invoke };
}

describe('admin routes', () => {
  it('queues fetch jobs instead of executing them inline', async () => {
    const invoke = vi.fn().mockResolvedValue({
      status: 'OK',
      mode: 'queued',
      job: 'fetch',
      provider: 'dmhy'
    });
    const { app } = createApp(invoke);

    const response = await app.request('http://localhost/admin/resources/dmhy', {
      method: 'POST',
      headers: {
        authorization: 'Bearer test-secret'
      }
    });

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toMatchObject({
      status: 'OK',
      mode: 'queued',
      job: 'fetch',
      provider: 'dmhy'
    });
    expect(invoke).toHaveBeenCalledWith('resources.fetch', { provider: 'dmhy' });
  });

  it('queues sync jobs with normalized start and end values', async () => {
    const invoke = vi.fn().mockResolvedValue({
      status: 'OK',
      mode: 'already_running',
      job: 'sync',
      provider: 'moe',
      start: 3,
      end: 7
    });
    const { app } = createApp(invoke);

    const response = await app.request('http://localhost/admin/resources/moe/sync?start=3&end=7', {
      method: 'POST',
      headers: {
        authorization: 'Bearer test-secret'
      }
    });

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toMatchObject({
      status: 'OK',
      mode: 'already_running',
      job: 'sync',
      provider: 'moe',
      start: 3,
      end: 7
    });
    expect(invoke).toHaveBeenCalledWith('resources.sync', {
      provider: 'moe',
      start: 3,
      end: 7
    });
  });

  it('returns 503 when cron is unavailable', async () => {
    const { app } = createApp(vi.fn().mockResolvedValue(undefined));

    const response = await app.request('http://localhost/admin/resources/ani', {
      method: 'POST',
      headers: {
        authorization: 'Bearer test-secret'
      }
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      status: 'ERROR',
      message: 'Cron service unavailable.'
    });
  });

  it('patches a resource subject through cron RPC', async () => {
    const invoke = vi.fn().mockResolvedValue({
      status: 'OK',
      changed: true,
      previous: { subjectId: 100 },
      resource: {
        id: 1,
        provider: 'dmhy',
        providerId: '723509',
        title: 'resource',
        subjectId: 200
      }
    });
    const { app } = createApp(invoke);

    const response = await app.request('http://localhost/admin/resources/dmhy/723509', {
      method: 'PATCH',
      headers: {
        authorization: 'Bearer test-secret',
        'content-type': 'application/json'
      },
      body: JSON.stringify({ subjectId: 200 })
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: 'OK',
      changed: true,
      previous: { subjectId: 100 },
      resource: {
        provider: 'dmhy',
        providerId: '723509',
        subjectId: 200
      }
    });
    expect(invoke).toHaveBeenCalledWith('resources.patch', {
      provider: 'dmhy',
      providerId: '723509',
      patch: { subjectId: 200 }
    });
  });

  it('accepts a detail-only resource patch', async () => {
    const invoke = vi.fn().mockResolvedValue({
      status: 'OK',
      changed: false,
      previous: { subjectId: 100 },
      resource: {
        id: 1,
        provider: 'dmhy',
        providerId: '723509',
        title: 'resource',
        subjectId: 100
      },
      detailRefreshed: true
    });
    const { app } = createApp(invoke);

    const response = await app.request('http://localhost/admin/resources/dmhy/723509', {
      method: 'PATCH',
      headers: {
        authorization: 'Bearer test-secret',
        'content-type': 'application/json'
      },
      body: JSON.stringify({ detail: true })
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: 'OK',
      changed: false,
      detailRefreshed: true
    });
    expect(invoke).toHaveBeenCalledWith('resources.patch', {
      provider: 'dmhy',
      providerId: '723509',
      patch: { detail: true }
    });
  });

  it('rejects an invalid subject patch before invoking cron', async () => {
    const { app, invoke } = createApp();

    const response = await app.request('http://localhost/admin/resources/dmhy/723509', {
      method: 'PATCH',
      headers: {
        authorization: 'Bearer test-secret',
        'content-type': 'application/json'
      },
      body: JSON.stringify({ subjectId: 0 })
    });

    expect(response.status).toBe(400);
    expect(invoke).not.toHaveBeenCalled();
  });

  it('rejects empty and unsupported resource patches', async () => {
    const { app, invoke } = createApp();

    for (const body of [{}, { detail: false }, { title: 'unsupported' }]) {
      const response = await app.request('http://localhost/admin/resources/dmhy/723509', {
        method: 'PATCH',
        headers: {
          authorization: 'Bearer test-secret',
          'content-type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      expect(response.status).toBe(400);
    }

    expect(invoke).not.toHaveBeenCalled();
  });

  it('maps missing resources and subjects to 404', async () => {
    const invoke = vi.fn().mockResolvedValue({
      status: 'ERROR',
      code: 'SUBJECT_NOT_FOUND',
      message: 'Subject 999 not found'
    });
    const { app } = createApp(invoke);

    const response = await app.request('http://localhost/admin/resources/dmhy/723509', {
      method: 'PATCH',
      headers: {
        authorization: 'Bearer test-secret',
        'content-type': 'application/json'
      },
      body: JSON.stringify({ subjectId: 999 })
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ code: 'SUBJECT_NOT_FOUND' });
  });

  it('returns 503 when cron is unavailable for a subject patch', async () => {
    const { app } = createApp(vi.fn().mockResolvedValue(undefined));

    const response = await app.request('http://localhost/admin/resources/dmhy/723509', {
      method: 'PATCH',
      headers: {
        authorization: 'Bearer test-secret',
        'content-type': 'application/json'
      },
      body: JSON.stringify({ subjectId: 200 })
    });

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      status: 'ERROR',
      message: 'Cron service unavailable.'
    });
  });

  it('requires admin bearer authentication for subject patches', async () => {
    const { app, invoke } = createApp();

    const response = await app.request('http://localhost/admin/resources/dmhy/723509', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ subjectId: 200 })
    });

    expect(response.status).toBe(401);
    expect(invoke).not.toHaveBeenCalled();
  });
});
