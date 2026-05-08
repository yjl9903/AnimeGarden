import { NetworkError } from '@animegarden/scraper';
import type { ProviderType, ScrapedResource } from '@animegarden/client';

import type { System } from '../system/index.ts';
import type {
  Notification,
  ResourcesAdminAck,
  ResourcesFetchRpcPayload,
  ResourcesSyncRpcPayload
} from '../system/types.ts';

import type { NewResource } from './types.ts';

import { ScraperProviders } from '../providers/index.ts';

function toNewResource(resource: ScrapedResource, fetchedAt?: Date): NewResource {
  return {
    provider: resource.provider,
    providerId: resource.providerId,
    title: resource.title,
    href: resource.href,
    type: resource.type,
    magnet: resource.magnet,
    tracker: resource.tracker,
    size: resource.size,
    createdAt: new Date(resource.createdAt),
    fetchedAt,
    publisher: resource.publisher
      ? {
          providerId: resource.publisher.id,
          name: resource.publisher.name,
          avatar: resource.publisher.avatar
        }
      : undefined,
    fansub: resource.fansub
      ? {
          providerId: resource.fansub.id,
          name: resource.fansub.name,
          avatar: resource.fansub.avatar
        }
      : undefined
  };
}

function hasNotificationChanges(notification: Notification) {
  return (
    notification.resources.inserted.length > 0 ||
    notification.resources.updated.length > 0 ||
    notification.resources.deleted.length > 0 ||
    notification.duplicated.attached.length > 0 ||
    notification.duplicated.detached.length > 0
  );
}

export async function runFetchJob(sys: System, platform: ProviderType) {
  sys.logger.info(`Start fetching and upserting ${platform} resources`);

  try {
    const provider = ScraperProviders.get(platform)!;
    const fetchedAt = new Date();
    const newResources = (await provider.fetchLatestResources(sys))
      .map((resource) => toNewResource(resource, fetchedAt))
      .sort((lhs, rhs) => lhs.createdAt.getTime() - rhs.createdAt.getTime());

    const upsert = await sys.modules.resources.upsertResources(newResources, {
      indexSubject: true
    });

    const duplicated = await sys.modules.resources.maintainDuplicatedResources(upsert.changed);

    const notification: Notification = {
      resources: {
        inserted: upsert.inserted,
        updated: upsert.updated,
        deleted: []
      },
      duplicated
    };

    if (hasNotificationChanges(notification)) {
      await sys.modules.providers.updateRefreshTimestamp(platform, fetchedAt);
      await sys.notifyRefreshedResources(notification);

      void sys.modules.push.enqueueResourceMessages(upsert.inserted.map((resource) => resource.id));
      void sys.modules.push.enqueueFailedResourceMessages();
    } else {
      void sys.modules.push.enqueueFailedResourceMessages();
    }

    sys.logger.success(
      `Finish fetching ${platform} resources: ${upsert.inserted.length} inserted, ${upsert.updated.length} updated, ${duplicated.attached.length} attached, ${duplicated.detached.length} detached`
    );

    return { upsert, duplicated };
  } catch (error) {
    sys.logger.error(error);
    if (error instanceof NetworkError) {
      await sys.modules.providers.updateActiveStatus(platform, false);
    }
    return undefined;
  }
}

export async function runSyncJob(
  sys: System,
  platform: ProviderType,
  options: Pick<ResourcesSyncRpcPayload, 'start' | 'end'>
) {
  sys.logger.info(`Start syncing ${platform} resources`, options);

  try {
    const provider = ScraperProviders.get(platform)!;
    const fetchedAt = new Date();
    const newResources = (await provider.fetchResourcePages(sys, options.start, options.end))
      .map((resource) => toNewResource(resource, fetchedAt))
      .sort((lhs, rhs) => lhs.createdAt.getTime() - rhs.createdAt.getTime());

    const upsert = await sys.modules.resources.upsertResources(newResources, {
      indexSubject: true
    });

    const deleted = await sys.modules.resources.markDeletedResources(platform, newResources);

    const duplicateChangedIds = [
      ...upsert.changed,
      ...deleted.deleted.map((resource) => resource.id)
    ];

    const duplicated = await sys.modules.resources.maintainDuplicatedResources(duplicateChangedIds);

    const notification: Notification = {
      resources: {
        inserted: upsert.inserted,
        updated: upsert.updated,
        deleted: deleted.deleted.map((resource) => resource.id)
      },
      duplicated
    };

    if (hasNotificationChanges(notification)) {
      await sys.modules.providers.updateRefreshTimestamp(platform, new Date());
      await sys.notifyRefreshedResources(notification);
    }

    sys.logger.success(
      `Finish syncing ${platform} resources: ${upsert.inserted.length} inserted, ${upsert.updated.length} updated, ${deleted.deleted.length} deleted, ${notification.duplicated.attached.length} attached, ${notification.duplicated.detached.length} detached`
    );

    return {
      upsert,
      duplicated: notification.duplicated,
      deleted
    };
  } catch (error) {
    sys.logger.error(error);
    if (error instanceof NetworkError) {
      await sys.modules.providers.updateActiveStatus(platform, false);
    }
    return undefined;
  }
}

class ResourcesJobCoordinator {
  private readonly running = new Map<ProviderType, 'fetch' | 'sync'>();

  private readonly system: System;

  public constructor(system: System) {
    this.system = system;
  }

  public queueFetch(provider: ProviderType): ResourcesAdminAck {
    return this.queue(provider, 'fetch', () => runFetchJob(this.system, provider));
  }

  public queueSync(
    provider: ProviderType,
    options: Pick<ResourcesSyncRpcPayload, 'start' | 'end'>
  ): ResourcesAdminAck {
    return this.queue(provider, 'sync', () => runSyncJob(this.system, provider, options));
  }

  private queue(
    provider: ProviderType,
    job: 'fetch' | 'sync',
    run: () => Promise<unknown>
  ): ResourcesAdminAck {
    if (this.running.has(provider)) {
      return {
        status: 'OK',
        mode: 'already_running',
        job,
        provider
      };
    }

    this.running.set(provider, job);
    void run().finally(() => {
      this.running.delete(provider);
    });

    return {
      status: 'OK',
      mode: 'queued',
      job,
      provider
    };
  }
}

export function registerResourcesJobRpc(sys: System) {
  const coordinator = new ResourcesJobCoordinator(sys);

  sys.rpc.define('resources.fetch', async (payload: ResourcesFetchRpcPayload) => {
    return coordinator.queueFetch(payload.provider);
  });

  sys.rpc.define('resources.sync', async (payload: ResourcesSyncRpcPayload) => {
    return coordinator.queueSync(payload.provider, payload);
  });

  return coordinator;
}
