import { bearerAuth } from 'hono/bearer-auth';

import { NetworkError } from '@animegarden/scraper';
import { SupportProviders, type System, anonymous } from '@animegarden/database';

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
        const resp = await syncResources(sys, provider, 1, 10);

        return c.json({
          status: 'OK',
          ...resp
        } as const);
      });
  }

  return app;
});

async function fetchResources(sys: System, platform: string) {
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
        indexSubject: true
      }
    );

    // TODO: maintain provider status

    sys.logger.success(`Finish inserting ${resources.inserted.length} new ${platform} resources`);

    return {
      users,
      teams,
      resources
    };
  } catch (error) {
    sys.logger.error(error);
    if (error instanceof NetworkError) {
      // TODO: maintain provider status
    }
    return undefined;
  }
}

async function syncResources(sys: System, platform: string, from: number, to: number) {
  sys.logger.info(`Start syncing and updating ${platform} resources`);

  try {
    const provider = ScraperProviders.get(platform)!;

    // TODO:
    // const newResources = await provider.fetchLatestResources(sys);
    // Sort created at asc
    // newResources.sort((lhs, rhs) => lhs.createdAt.localeCompare(rhs.createdAt));

    // const users = await sys.modules.users.insertUsers(
    //   filterDef(
    //     newResources.map((r) =>
    //       r.publisher
    //         ? {
    //             provider: r.provider,
    //             providerId: r.publisher.id,
    //             name: r.publisher.name,
    //             avatar: r.publisher.avatar
    //           }
    //         : undefined
    //     )
    //   )
    // );

    // const teams = await sys.modules.teams.insertTeams(
    //   filterDef(
    //     newResources.map((r) =>
    //       r.fansub
    //         ? {
    //             provider: r.provider,
    //             providerId: r.fansub.id,
    //             name: r.fansub.name,
    //             avatar: r.fansub.avatar
    //           }
    //         : undefined
    //     )
    //   )
    // );

    // const fetchedAt = new Date();
    // const resources = await sys.modules.resources.insertResources(
    //   newResources.map((r) => ({
    //     ...r,
    //     publisher: r.publisher?.name ?? anonymous,
    //     fansub: r.fansub?.name,
    //     createdAt: new Date(r.createdAt),
    //     fetchedAt
    //   })),
    //   {
    //     indexSubject: true
    //   }
    // );

    // TODO: maintain provider status

    // sys.logger.success(`Finish updating ${resources.inserted.length} new ${platform} resources`);

    return {
      // users,
      // teams,
      // resources
    };
  } catch (error) {
    sys.logger.error(error);
    if (error instanceof NetworkError) {
      // TODO: maintain provider status
    }
    return undefined;
  }
}

function filterDef<T>(arr: Array<T | undefined | null>) {
  return arr.filter(Boolean) as T[];
}
