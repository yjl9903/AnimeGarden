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
});
