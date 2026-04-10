import fs from 'fs-extra';
import path from 'path';

import { type ProviderType, type ScrapedResource, SupportProviders } from '@animegarden/client';

import type { System } from '../system';

import type { NewResource } from './types';

export interface ImportResourcesOptions {
  dir?: string;

  provider?: string;

  batchSize?: number;
}

function orderImportFiles(files: string[]) {
  const pages = files
    .map((file) => {
      const match = /^(\d+)\.json$/.exec(file);
      return match
        ? {
            file,
            page: +match[1]
          }
        : undefined;
    })
    .filter(Boolean)
    .sort((lhs, rhs) => rhs.page - lhs.page);

  const others = files
    .filter((file) => !/^\d+\.json$/.test(file))
    .sort((lhs, rhs) => lhs.localeCompare(rhs));

  return [...pages.map((item) => item.file), ...others];
}

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

export async function runImportResources(sys: System, options: ImportResourcesOptions) {
  if (!options.dir) {
    throw new TypeError(`Import dir does not exist`);
  }

  const inputDir = options.dir;
  if (!(await fs.pathExists(inputDir))) {
    throw new TypeError(`Import dir does not exist: ${inputDir}`);
  }

  const files = orderImportFiles(
    (await fs.readdir(inputDir)).filter((file) => path.extname(file).toLowerCase() === '.json')
  );
  if (files.length === 0) {
    throw new TypeError(`No JSON files found in ${inputDir}`);
  }

  const batchSize = Math.max(1, options.batchSize ?? 10);
  const totalBatches = Math.ceil(files.length / batchSize);
  let inserted = 0;
  let updated = 0;
  let attached = 0;
  let detached = 0;
  let errors = 0;

  for (let offset = 0; offset < files.length; offset += batchSize) {
    const batchIndex = Math.floor(offset / batchSize) + 1;
    const batchFiles = files.slice(offset, offset + batchSize);

    sys.logger.info(
      `Importing batch ${batchIndex}/${totalBatches}: ${batchFiles[0]} .. ${batchFiles.at(-1)}`
    );

    const fetchedAt = new Date();
    const pages = await Promise.all(
      batchFiles.map(async (file) => {
        const content = await fs.readJSON(path.join(inputDir, file));
        if (!Array.isArray(content)) {
          throw new TypeError(`Import file is not a resource array: ${path.join(inputDir, file)}`);
        }
        return content as ScrapedResource[];
      })
    );

    const scraped = pages.flat();
    const filtered = scraped.filter(
      (resource) => resource.provider !== 'mikan' || !!resource.publisher?.name?.trim()
    );

    const resources = filtered
      .map((resource) => toNewResource(resource, fetchedAt))
      .sort((lhs, rhs) => lhs.createdAt.getTime() - rhs.createdAt.getTime());

    const upsert = await sys.modules.resources.upsertResources(resources, {
      indexSubject: true
    });
    const duplicated = await sys.modules.resources.maintainDuplicatedResources(upsert.changed);

    inserted += upsert.inserted.length;
    updated += upsert.updated.length;
    attached += duplicated.attached.length;
    detached += duplicated.detached.length;
    errors += upsert.errors.length;

    sys.logger.info(
      `Imported batch ${batchIndex}/${totalBatches}: ${upsert.inserted.length} inserted, ${upsert.updated.length} updated, ${duplicated.attached.length} attached, ${duplicated.detached.length} detached, ${upsert.errors.length} errors`
    );
  }

  sys.logger.info(
    `Import finished: ${inserted} inserted, ${updated} updated, ${attached} attached, ${detached} detached, ${errors} errors`
  );
}
