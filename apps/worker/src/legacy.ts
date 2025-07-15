import { z } from 'zod';

const dateLike = z
  .union([z.coerce.number().transform((n) => new Date(n)), z.coerce.date()])
  .optional();

const stringArray = z.union([z.string().transform((s) => [s]), z.array(z.string())]);
const stringArrayLike = z.coerce
  .string()
  .transform((t) => {
    try {
      return JSON.parse(t);
    } catch {
      return [t];
    }
  })
  .pipe(stringArray)
  .optional();

// const stringArrayArray = z.union([
//   z.string().transform((s) => [[s]]),
//   z.array(stringArray).default([])
// ]);

const numberArray = z.union([z.array(z.coerce.number()), z.coerce.number().transform((n) => [n])]);
const numberArrayLike = z.coerce
  .string()
  .transform((t) => JSON.parse(t))
  .catch(undefined)
  .pipe(z.union([numberArray, stringArray]))
  .optional();

const providerEnum = z.enum(['dmhy', 'moe']);
const providerLike = z
  .union([
    providerEnum.transform((t) => [t]),
    z.coerce
      .string()
      .transform((t) => {
        try {
          return JSON.parse(t);
        } catch {
          return [t];
        }
      })
      .pipe(z.array(providerEnum)),
    z.array(providerEnum)
  ])
  .transform((t) => [...new Set(t)]);

export const FilterSchema = z.object({
  provider: providerLike.optional(),
  duplicate: z.coerce.boolean().optional(),
  page: z
    .number()
    .default(1)
    .refine((p) => p >= 1),
  pageSize: z
    .number()
    .default(100)
    .refine((ps) => 1 <= ps && ps <= 1000),
  fansubId: z.array(z.union([z.coerce.number().transform((n) => '' + n), z.string()])).optional(),
  fansubName: z.string().array().optional(),
  publisherId: z.string().array().optional(),
  type: z.string().optional(),
  before: dateLike,
  after: dateLike,
  search: stringArray.optional(),
  include: stringArray.optional(),
  keywords: stringArray.optional(),
  exclude: stringArray.optional()
});
