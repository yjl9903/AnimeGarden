import { parse } from 'yaml';

function resolveEnvVariable(name: string): string | null {
  const value = process.env[name];
  return value === undefined ? null : value;
}

function unwrapYAMLNodeValue(input: unknown): unknown {
  if (!input || typeof input !== 'object') {
    return input;
  }
  if ('value' in input) {
    return (input as { value: unknown }).value;
  }
  return input;
}

function resolveEnvTagSequence(values: unknown[]): unknown {
  const normalized = values.map((value) => unwrapYAMLNodeValue(value));
  if (normalized.length === 0) {
    return null;
  }
  const envNames = normalized.length === 1 ? normalized : normalized.slice(0, -1);
  for (const envName of envNames) {
    if (typeof envName !== 'string') {
      continue;
    }
    const resolved = process.env[envName];
    if (resolved !== undefined) {
      return resolved;
    }
  }
  if (normalized.length > 1) {
    const fallback = normalized.at(-1);
    return fallback === undefined ? null : fallback;
  }
  return null;
}

function resolveEnvTag(value: unknown): unknown {
  const normalized = unwrapYAMLNodeValue(value);
  if (typeof normalized === 'string') {
    return resolveEnvVariable(normalized);
  }
  if (Array.isArray(normalized)) {
    return resolveEnvTagSequence(normalized);
  }
  return null;
}

export function parseYAMLWithEnvTag<T = unknown>(yaml: string): T {
  const parsed = parse(yaml, {
    customTags: [
      {
        tag: '!env',
        resolve(value: string) {
          return resolveEnvTag(value);
        }
      },
      {
        tag: '!env',
        collection: 'seq',
        resolve(value: unknown) {
          const sequence = value as { items: unknown[] };
          return resolveEnvTagSequence(sequence.items);
        }
      }
    ]
  });
  return parsed;
}
