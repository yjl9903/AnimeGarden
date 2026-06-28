import spec from './spec.json';

type JsonRecord = Record<string, any>;

/** Returns the public, agent-facing OpenAPI spec without internal admin endpoints. */
export function getPublicOpenApiSpec(version: string, license: string) {
  const raw = spec as JsonRecord;
  const components = { ...raw.components };

  delete components.securitySchemes;

  return {
    ...raw,
    info: {
      ...raw.info,
      version,
      license: {
        ...raw.info.license,
        name: license
      }
    },
    paths: Object.fromEntries(
      Object.entries(raw.paths).filter(([path]) => !path.startsWith('/admin/'))
    ),
    components,
    tags: raw.tags.filter((tag: JsonRecord) => tag.name !== 'Admin')
  };
}
