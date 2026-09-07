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
    expect(spec.paths['/detail/{provider}/{id}'].get.responses['404']).toBeDefined();
    expect(spec.paths['/collection/{hash}'].get.responses['404']).toBeDefined();
  });

  it('documents pagination consistently for resources and collection results', async () => {
    const response = await (Route.options.server!.handlers as any).GET({} as any);
    const spec = (await response.json()) as any;
    const resources = spec.components.schemas.ResourcesResponse;
    const collectionResult =
      spec.paths['/collection/{hash}'].get.responses['200'].content['application/json'].schema
        .properties.results.items;

    for (const result of [resources, collectionResult]) {
      expect(result.properties.pagination).toEqual({
        $ref: '#/components/schemas/PaginationInfo'
      });
      expect(result.required).toContain('pagination');
      expect(result.properties).not.toHaveProperty('complete');
      expect(result.required).not.toContain('complete');
    }
    expect(spec.components.schemas.PaginationInfo.required).toEqual([
      'page',
      'pageSize',
      'complete'
    ]);
  });
});
