import { bearerAuth } from 'hono/bearer-auth';

import { NetworkError } from '@animegarden/scraper';
import { type System, anonymous } from '@animegarden/database';
import { type ProviderType, SupportProviders } from '@animegarden/client';

import { defineHandler } from '../utils/hono';
import { ScraperProviders } from '../providers';

export const defineAdminRoutes = defineHandler((sys, app) => {
  const auth = bearerAuth({ token: sys.secret });
  app.use('/admin/', auth);

  for (const provider of SupportProviders) {
    app
      .post(`/admin/resources/${provider}`, async (c) => {
        const resp = await fetchResources(sys, provider);

        return c.json({
          status: 'OK',
          ...resp
        } as const);
      })
      .post(`/admin/resources/${provider}/sync`, async (c) => {
        const start = +(c.req.query('start') ?? '1');
        const end = +(c.req.query('end') ?? '10');
        const resp = await syncResources(sys, provider, start, end);

        return c.json({
          status: 'OK',
          ...resp
        } as const);
      });
  }

  return app;
});

async function fetchResources(sys: System, platform: ProviderType) {
  sys.logger.info(`Start fetching and inserting new ${platform} resources`);

  try {
    const provider = ScraperProviders.get(platform)!;

    const newResources = await provider.fetchLatestResources(sys);
    // Sort created at asc
    newResources.sort((lhs, rhs) => lhs.createdAt.localeCompare(rhs.createdAt));

    const users = await sys.modules.users.insertUsers(
      filterDef(
        newResources.map((r) =>
          r.publisher
            ? {
                provider: r.provider,
                providerId: r.publisher.id,
                name: r.publisher.name,
                avatar: r.publisher.avatar
              }
            : undefined
        )
      )
    );

    const teams = await sys.modules.teams.insertTeams(
      filterDef(
        newResources.map((r) =>
          r.fansub
            ? {
                provider: r.provider,
                providerId: r.fansub.id,
                name: r.fansub.name,
                avatar: r.fansub.avatar
              }
            : undefined
        )
      )
    );

    if (newResources.length > 0) {
      const fetchedAt = new Date();
      const resources = await sys.modules.resources.insertResources(
        newResources.map((r) => ({
          ...r,
          publisher: r.publisher?.name ?? anonymous,
          fansub: r.fansub?.name,
          createdAt: new Date(r.createdAt),
          fetchedAt
        })),
        {
          indexSubject: true,
          updateDuplicatedId: true
        }
      );

      // Maintain provider status
      if (resources.inserted.length > 0) {
        await sys.modules.providers.updateRefreshTimestamp(platform, fetchedAt);
        await sys.modules.providers.notifyRefreshedResources(resources.inserted);

        sys.logger.success(
          `Finish inserting ${resources.inserted.length} new ${platform} resources`
        );
      }

      return {
        users,
        teams,
        resources
      };
    } else {
      return {
        users,
        teams,
        resources: []
      };
    }
  } catch (error) {
    sys.logger.error(error);
    if (error instanceof NetworkError) {
      await sys.modules.providers.updateActiveStatus(platform, false);
    }
    return undefined;
  }
}

async function syncResources(sys: System, platform: ProviderType, start: number, end: number) {
  sys.logger.info(`Start syncing and updating ${platform} resources`);

  try {
    const provider = ScraperProviders.get(platform)!;

    const newResources = (await provider.fetchResourcePages(sys, start, end)).map((r) => ({
      ...r,
      publisher: r.publisher?.name ?? anonymous,
      fansub: r.fansub?.name,
      createdAt: new Date(r.createdAt)
    }));
    // Sort created at asc
    newResources.sort((lhs, rhs) => lhs.createdAt.getTime() - rhs.createdAt.getTime());

    if (newResources.length > 0) {
      // 1. Update resource
      const updatedAt = new Date();
      const updated: Array<{
        id: number;
        provider: ProviderType;
        providerId: string;
        title: string;
      }> = [];
      for (const r of newResources) {
        const resp = await sys.modules.resources.updateResource(r, updatedAt);
        if (resp && resp.updated) {
          updated.push(resp.updated);
        }
      }

      if (updated.length > 0) {
        await sys.modules.providers.updateRefreshTimestamp(platform, updatedAt);
        await sys.modules.providers.notifyRefreshedResources(updated);

        sys.logger.success(`Finish updating ${updated.length} new ${platform} resources`);
      }

      // 2. Delete resources
      const deletedAt = new Date();
      const sync = await sys.modules.resources.syncResources(platform, newResources);
      if (sync.deleted.length > 0) {
        await sys.modules.providers.updateRefreshTimestamp(platform, deletedAt);

        sys.logger.success(`Finish deleting ${updated.length} missing ${platform} resources`);
      }

      return {
        resources: {
          updated,
          deleted: sync.deleted
        }
      };
    } else {
      return {
        resources: undefined
      };
    }
  } catch (error) {
    sys.logger.error(error);
    if (error instanceof NetworkError) {
      await sys.modules.providers.updateActiveStatus(platform, false);
    }
    return undefined;
  }
}

function filterDef<T>(arr: Array<T | undefined | null>) {
  return arr.filter(Boolean) as T[];
}
