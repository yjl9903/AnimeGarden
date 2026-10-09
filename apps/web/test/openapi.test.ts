import { describe, expect, it } from 'vitest';

import { parseCollection, parseURLSearch } from '@animegarden/client';

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

    const status = spec.paths['/'].get.responses['200'].content['application/json'].schema;
    expect(status.required).toEqual(['status', 'timestamp', 'providers', 'links']);
    expect(status.properties.status.enum).toEqual(['OK']);
    expect(status.properties).not.toHaveProperty('message');
    expect(status.properties.links.required).toEqual(['openapi', 'llms']);
    for (const link of Object.values(status.properties.links.properties) as any[]) {
      expect(link.type).toBe('string');
      expect(link.format).toBe('uri');
      expect(new URL(link.example).protocol).toBe('https:');
    }
  });

  it('documents timestamps in response headers without changing the root status body', async () => {
    const response = await (Route.options.server!.handlers as any).GET({} as any);
    const spec = (await response.json()) as any;

    for (const path of [
      '/resources',
      '/resources/{provider}',
      '/detail/{provider}/{id}',
      '/detail/infohash/{hash}',
      '/collection',
      '/collection/{hash}'
    ]) {
      for (const operation of Object.values(spec.paths[path]) as any[]) {
        const success = operation.responses['200'];
        expect(success.headers['X-Response-Timestamp']).toEqual({
          $ref: '#/components/headers/ResponseTimestamp'
        });
        const schema = success.content['application/json'].schema;
        const body = schema.$ref ? spec.components.schemas[schema.$ref.split('/').at(-1)] : schema;
        expect(body.properties).not.toHaveProperty('timestamp');
        expect(body.required).not.toContain('timestamp');
      }
    }
    expect(spec.components.headers.ResponseTimestamp.schema).toEqual({
      type: 'string',
      format: 'date-time'
    });
    const root = spec.paths['/'].get.responses['200'].content['application/json'].schema;
    expect(root.required).toContain('timestamp');
    expect(root.properties.timestamp.format).toBe('date-time');
  });

  it('uses query parameter names understood by the resource parser', async () => {
    const response = await (Route.options.server!.handlers as any).GET({} as any);
    const spec = (await response.json()) as any;
    const parameters = spec.components.parameters;
    const query = new URLSearchParams();
    query.append(parameters.KeywordsParam.name, 'hello');
    query.append(parameters.KeywordsParam.name, 'world');
    query.set(parameters.PresetParam.name, 'bangumi');

    expect(parseURLSearch(query).filter).toMatchObject({
      keywords: ['hello', 'world'],
      preset: 'bangumi'
    });
    expect(parseURLSearch(undefined, { keywords: ['hello'] }).filter.keywords).toEqual(['hello']);
    for (const path of ['/resources', '/resources/{provider}', '/feed.xml']) {
      expect(spec.paths[path].get.parameters).toContainEqual({
        $ref: '#/components/parameters/PresetParam'
      });
    }
  });

  it('documents collection inputs accepted by the current parser', async () => {
    const response = await (Route.options.server!.handlers as any).GET({} as any);
    const { components } = (await response.json()) as any;
    const request = components.schemas.CollectionRequest;
    const filter = components.schemas.CollectionFilter;

    expect(parseCollection(request.example)).toBeDefined();
    const minimal = { authorization: 'test', filters: [{ searchParams: '' }] };
    expect(parseCollection(minimal)).toMatchObject({ name: '', filters: [{ name: '' }] });
    expect(request.required).toEqual(Object.keys(minimal));
    expect(filter.required).toEqual(Object.keys(minimal.filters[0]));
    expect(
      parseCollection({ authorization: 'test', filters: [{ name: 'missing query' }] })
    ).toBeUndefined();

    const { minItems, maxItems } = request.properties.filters;
    expect(minItems).toBe(1);
    expect(maxItems).toBe(50);
    for (const count of [minItems - 1, minItems, maxItems, maxItems + 1]) {
      const parsed = parseCollection({
        authorization: 'test',
        filters: Array.from({ length: count }, () => ({ searchParams: '' }))
      });
      expect(parsed !== undefined).toBe(count >= minItems && count <= maxItems);
    }
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
