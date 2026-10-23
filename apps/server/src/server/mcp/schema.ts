import { z } from 'zod/v3';

export const searchResourcesInputSchema = z
  .object({
    fansubs: z
      .array(z.string())
      .optional()
      .describe('Fansub group names. Match ANY value (OR). Example: ["喵萌奶茶屋", "LoliHouse"].'),
    publishers: z
      .array(z.string())
      .optional()
      .describe(
        'Publisher names. Match ANY value (OR). Combined with fansubs in OR logic within this group.'
      ),
    types: z
      .array(z.enum(['动画', '合集', '音乐', '日剧', 'RAW', '漫画', '游戏', '特摄', '其他']))
      .optional()
      .describe('Resource categories. Match ANY value (OR). Common values: "动画", "合集".'),
    before: z.coerce
      .date()
      .optional()
      .describe(
        'Upper time bound (inclusive). Keep resources with createdAt <= before. Accepts date string or timestamp.'
      ),
    after: z.coerce
      .date()
      .optional()
      .describe(
        'Lower time bound (inclusive). Keep resources with createdAt >= after. Accepts date string or timestamp.'
      ),
    subjects: z
      .array(z.coerce.number().int())
      .optional()
      .describe('Bangumi subject IDs. Match ANY value (OR).'),
    search: z
      .array(z.string())
      .optional()
      .describe(
        'Full-text query terms (tokenized search). If provided, it takes precedence over include.'
      ),
    include: z
      .array(z.string())
      .optional()
      .describe(
        'Title-contains terms. Match ANY value (OR). Only effective when search is not provided.'
      ),
    keywords: z
      .array(z.string())
      .optional()
      .describe('Required title keywords. Title must contain ALL values (AND).'),
    exclude: z
      .array(z.string())
      .optional()
      .describe('Blocked title keywords. Exclude resources containing ANY value.'),
    page: z.coerce
      .number()
      .int()
      .optional()
      .describe(
        'Page number for pagination, starting from 1. Default 1. Use together with pageSize to fetch results beyond the first 30.'
      ),
    pageSize: z.coerce
      .number()
      .int()
      .optional()
      .describe(
        'Number of results per page. Default 30. The server accepts at most 1000; values out of range fall back to the server default page size.'
      )
  })
  .describe('Search parameters for Anime Garden resources.');
