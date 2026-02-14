import { z } from 'zod';

const NonNullUnknownSchema = z.unknown().refine((value) => value !== null, {
  message: 'Expected non-null value.'
});

export const SubjectStorageSchema = z
  .object({
    driver: z.string().optional(),
    path: z.string().optional()
  })
  .optional();

export const RawSubjectSchema = z.object({
  name: z.coerce.string().min(1).max(128),
  enabled: z.coerce.boolean().optional(),
  bgm: z.coerce.number().optional(),
  tmdb: z
    .object({
      type: z.string(),
      id: z.coerce.number()
    })
    .optional(),
  storage: SubjectStorageSchema,
  naming: NonNullUnknownSchema,
  source: NonNullUnknownSchema
});

export type RawSubject = z.infer<typeof RawSubjectSchema>;

export const RawCollectionSchema = z.object({
  name: z.string().optional(),
  enabled: z.boolean().optional(),
  subjects: z.array(RawSubjectSchema)
});

export type RawCollection = z.infer<typeof RawCollectionSchema>;
