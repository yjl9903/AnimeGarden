import { describe, expect, it } from 'vitest';

import { Route } from '../src/routes/openapi[.]json';

describe('openapi discovery', () => {
  it('publishes only public API metadata for agents', async () => {
    const response = await (Route.options.server!.handlers as any).GET({} as any);
    const spec = (await response.json()) as any;

    expect(response.status).toBe(200);
    expect(Object.keys(spec.paths).some((path) => path.startsWith('/admin/'))).toBe(false);
    expect(spec.components.securitySchemes).toBeUndefined();
    expect(spec.tags.map((tag: any) => tag.name)).not.toContain('Admin');
  });
});
