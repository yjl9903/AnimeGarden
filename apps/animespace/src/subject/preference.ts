import { z } from 'zod';

import type { AnimeGardenFilter } from './animegarden/schema.ts';
import type { NamingTemplate } from './source/naming.ts';
import type { KeywordsOrder, ResourcesOrder, SubjectSource } from './source/source.ts';

import { parseSourceOrder } from './source/schema.ts';
import { NamingTemplateMapSchema } from './source/naming.ts';
import { parseAnimeGardenPreference } from './animegarden/schema.ts';

export interface NamingPreference {
  readonly template?: NamingTemplate;
}

export interface Preference {
  readonly animegarden?: AnimeGardenFilter;

  readonly order?: ResourcesOrder;

  readonly naming?: NamingPreference;
}

const AnimeGardenPreferenceSchema = z
  .object({})
  .passthrough()
  .transform<AnimeGardenFilter>((raw, ctx) => {
    try {
      return parseAnimeGardenPreference(raw, 'preference.animegarden');
    } catch (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: error instanceof Error ? error.message : String(error)
      });
      return z.NEVER;
    }
  });

const NamingPreferenceSchema: z.ZodType<NamingPreference> = z
  .object({
    template: NamingTemplateMapSchema.optional()
  })
  .passthrough();

const OrderPreferenceSchema = z
  .object({})
  .passthrough()
  .transform<ResourcesOrder>((raw, ctx) => {
    try {
      return parseSourceOrder(raw, 'preference.order');
    } catch (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: error instanceof Error ? error.message : String(error)
      });
      return z.NEVER;
    }
  });

export const PreferenceSchema: z.ZodType<Preference | undefined> = z
  .object({
    animegarden: AnimeGardenPreferenceSchema.optional(),
    order: OrderPreferenceSchema.optional(),
    naming: NamingPreferenceSchema.optional()
  })
  .passthrough()
  .optional();

export function mergePreferenceValue<T extends object>(
  subjectValue: Partial<T> | undefined,
  collectionValue: Partial<T> | undefined,
  rootValue: Partial<T> | undefined,
  fallbackValue?: Partial<T>
): T {
  const keys = new Set<keyof T>([
    ...(Object.keys(fallbackValue ?? {}) as Array<keyof T>),
    ...(Object.keys(rootValue ?? {}) as Array<keyof T>),
    ...(Object.keys(collectionValue ?? {}) as Array<keyof T>),
    ...(Object.keys(subjectValue ?? {}) as Array<keyof T>)
  ]);

  const merged: Partial<T> = {};
  for (const key of keys) {
    const value = (subjectValue?.[key] ??
      collectionValue?.[key] ??
      rootValue?.[key] ??
      fallbackValue?.[key]) as T[keyof T] | undefined;
    if (value !== undefined) {
      merged[key] = value;
    }
  }

  return merged as T;
}

export function mergeSubjectSourcePreference(
  source: SubjectSource,
  collectionPreference: Preference | undefined,
  rootPreference: Preference | undefined
): SubjectSource {
  const mergedAnimeGardenFilter = source.animegarden
    ? mergePreferenceValue<AnimeGardenFilter>(
        source.animegarden.filter,
        collectionPreference?.animegarden,
        rootPreference?.animegarden
      )
    : undefined;

  const mergedOrder = mergeSourceOrderPreference(
    source,
    collectionPreference?.order,
    rootPreference?.order
  );

  return {
    ...source,
    animegarden: mergedAnimeGardenFilter
      ? {
          ...source.animegarden,
          filter: mergedAnimeGardenFilter
        }
      : undefined,
    order: mergedOrder
  };
}

function mergeSourceOrderPreference(
  source: SubjectSource,
  collectionOrder: ResourcesOrder | undefined,
  rootOrder: ResourcesOrder | undefined
): ResourcesOrder {
  // 1. Merge inherited source.order, or overwritten by source.animegarden.fansubs
  const preferenceOrder = source.order.fansubs ?? collectionOrder?.fansubs ?? rootOrder?.fansubs;
  const sourceFansubs = source.animegarden?.filter.fansubs ?? preferenceOrder;

  // 2. Merge keywords
  const hasKeywords = source.order.keywords || collectionOrder?.keywords || rootOrder?.keywords;
  const sourceKeywords: KeywordsOrder = [];
  for (const order of source.order.keywords ?? []) {
    const existed =
      collectionOrder?.keywords?.find((k) => k.name === order.name) ||
      rootOrder?.keywords?.find((k) => k.name === order.name);
    if (!existed) {
      sourceKeywords.push(order);
    }
  }
  for (const order of collectionOrder?.keywords ?? []) {
    const existed = rootOrder?.keywords?.find((k) => k.name === order.name);
    if (!existed) {
      sourceKeywords.push(order);
    } else {
      const overwritten = source.order.keywords?.find((k) => k.name === order.name);
      sourceKeywords.push(overwritten ?? order);
    }
  }
  for (const order of rootOrder?.keywords ?? []) {
    const overwritten =
      source.order.keywords?.find((k) => k.name === order.name) ??
      collectionOrder?.keywords?.find((k) => k.name === order.name);
    sourceKeywords.push(overwritten ?? order);
  }

  return {
    fansubs: sourceFansubs,
    keywords: hasKeywords ? sourceKeywords : undefined
  };
}
