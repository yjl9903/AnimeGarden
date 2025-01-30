import { memoAsync } from 'memofunc';

import type { System } from '@animegarden/database';

import { defineHandler } from '../utils/hono';

export const defineSitemapsRoutes = defineHandler((sys, app) =>
  app
    .get('/sitemaps/subjects', async (c) => {
      return c.json({
        status: 'OK',
        subjects: [...sys.modules.subjects.subjects]
          .sort((lhs, rhs) => rhs.activedAt.getTime() - lhs.activedAt.getTime())
          .map((sub) => ({ id: sub.id, activedAt: sub.activedAt, isArchived: sub.isArchived }))
      });
    })
    .get('/sitemaps/:year{[0-9]+}/:month{[0-9]+}', async (c) => {
      const now = new Date();
      const params = c.req.param();
      const year = +params.year;
      const month = +params.month;

      try {
        if (2020 <= year && year <= now.getFullYear()) {
          if (1 <= month && month <= (year < now.getFullYear() ? 12 : now.getMonth() + 1)) {
            const resources = await fetchMonth(sys, year, month);

            return c.json({
              status: 'OK',
              resources
            });
          }
        }
      } catch (error) {
        sys.logger.error(error);
      }

      return c.json({ status: 'ERROR', resources: [] });
    })
);

const fetchMonth = memoAsync(
  async (sys: System, year: number, month: number) => {
    return await sys.database.query.resources.findMany({
      columns: {
        id: true,
        provider: true,
        providerId: true,
        fetchedAt: true
      },
      where: (resources, { and, eq, isNull, gte, lt }) =>
        and(
          eq(resources.isDeleted, false),
          isNull(resources.duplicatedId),
          gte(resources.createdAt, getShanghai(year, month, 1)),
          lt(
            resources.createdAt,
            getShanghai(month === 12 ? year + 1 : year, month === 12 ? 1 : month, 1)
          )
        )
    });
  },
  {
    serialize: (_, year, month) => [year, month],
    expirationTtl: 60 * 60 * 1000
  }
);

function getShanghai(year: number, month: number, day: number) {
  // 创建一个 UTC 时间的 Date 对象
  const utcDate = new Date(Date.UTC(year, month - 1, day));

  // 使用上海时区偏移时间，计算对应的 Date 对象
  const shanghaiOffset = 8 * 60; // UTC+8 的分钟偏移
  const shanghaiTime = new Date(utcDate.getTime() - shanghaiOffset * 60 * 1000);

  return shanghaiTime;
}
