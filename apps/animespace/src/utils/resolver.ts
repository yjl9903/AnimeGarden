export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function dedupePreserveOrder<T>(values: T[]): T[] {
  const result: T[] = [];
  const set = new Set<T>();
  for (const value of values) {
    if (set.has(value)) {
      continue;
    }
    set.add(value);
    result.push(value);
  }
  return result;
}

export function resolveString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new Error(`${field} must be a string.`);
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

export function resolveBoolean(value: unknown, field: string): boolean | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    if (value === 'true') {
      return true;
    }
    if (value === 'false') {
      return false;
    }
  }
  throw new Error(`${field} must be a boolean.`);
}

export function resolveDate(value: unknown, field: string): Date | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const date =
    value instanceof Date
      ? new Date(value.getTime())
      : typeof value === 'string' || typeof value === 'number'
        ? new Date(value)
        : undefined;
  if (!date || Number.isNaN(date.getTime())) {
    throw new Error(`${field} must be a valid date.`);
  }
  return date;
}

export function resolveStringList(value: unknown, field: string): string[] | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const input = Array.isArray(value) ? value : [value];
  const parsed = input.map((item) => {
    if (typeof item !== 'string') {
      throw new Error(`${field} must be string or string array.`);
    }
    return item.trim();
  });
  const nonEmpty = parsed.filter((item) => item.length > 0);
  if (nonEmpty.length === 0) {
    return undefined;
  }
  return dedupePreserveOrder(nonEmpty);
}

export function resolveIntegerList(value: unknown, field: string): number[] | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const input = Array.isArray(value) ? value : [value];
  const parsed = input.map((item) => {
    const numericValue =
      typeof item === 'number'
        ? item
        : typeof item === 'string' && item.trim().length > 0
          ? Number(item.trim())
          : NaN;
    if (!Number.isFinite(numericValue) || !Number.isInteger(numericValue)) {
      throw new Error(`${field} must be integer or integer array.`);
    }
    return numericValue;
  });
  if (parsed.length === 0) {
    return undefined;
  }
  return dedupePreserveOrder(parsed);
}

export function resolveMergedStringList(
  singular: unknown,
  plural: unknown,
  singularField: string,
  pluralField: string
): string[] | undefined {
  const single = resolveStringList(singular, singularField) ?? [];
  const many = resolveStringList(plural, pluralField) ?? [];
  const merged = dedupePreserveOrder([...single, ...many]);
  return merged.length > 0 ? merged : undefined;
}

export function resolveMergedIntegerList(
  singular: unknown,
  plural: unknown,
  singularField: string,
  pluralField: string
): number[] | undefined {
  const single = resolveIntegerList(singular, singularField) ?? [];
  const many = resolveIntegerList(plural, pluralField) ?? [];
  const merged = dedupePreserveOrder([...single, ...many]);
  return merged.length > 0 ? merged : undefined;
}
