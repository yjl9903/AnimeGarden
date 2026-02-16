import { z } from 'zod';

import type { SubjectSource } from './source/source.ts';

import { PreferenceSchema } from './preference.ts';
import { SubjectType, parseSubjectSource } from './source/schema.ts';
import { type SubjectNaming, NamingTemplateMapSchema } from './source/naming.ts';

export const SubjectSourceSchema = z
  .object({})
  .passthrough()
  .transform<SubjectSource>((raw, ctx) => {
    try {
      return parseSubjectSource(raw, 'source');
    } catch (error) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: error instanceof Error ? error.message : String(error)
      });

      return z.NEVER;
    }
  });

const SubjectNamingObjectSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    season: z.number().int().optional(),
    year: z.number().int().optional(),
    month: z.number().int().optional(),
    template: NamingTemplateMapSchema.optional()
  })
  .passthrough();

export const SubjectNamingSchema: z.ZodType<
  Partial<SubjectNaming> | undefined,
  z.ZodTypeDef,
  unknown
> = z.preprocess((raw) => {
  if (typeof raw === 'string') {
    return { name: raw };
  }
  return raw;
}, SubjectNamingObjectSchema.optional());

export const SubjectStorageSchema = z
  .object({
    driver: z.string().optional(),
    path: z.string().optional()
  })
  .optional();

export const RawSubjectSchema = z.object({
  name: z.coerce.string().min(1).max(128),
  enabled: z.coerce.boolean().optional(),
  type: z
    .string()
    .transform((type) => {
      if (type.toLowerCase() === 'tv' || type === '动画') return SubjectType.TV;
      if (type.toLowerCase() === 'movie' || type === '电影') return SubjectType.Movie;
      return SubjectType.TV;
    })
    .default(SubjectType.TV),
  bgm: z.coerce.number().optional(),
  tmdb: z
    .object({
      type: z.string(),
      id: z.coerce.number()
    })
    .optional(),
  storage: SubjectStorageSchema,
  naming: SubjectNamingSchema,
  source: SubjectSourceSchema
});

export type RawSubject = z.infer<typeof RawSubjectSchema>;

export const RawCollectionSchema = z.object({
  name: z.string().optional(),
  enabled: z.boolean().optional(),
  preference: PreferenceSchema,
  subjects: z.array(RawSubjectSchema)
});

export type RawCollection = z.infer<typeof RawCollectionSchema>;
