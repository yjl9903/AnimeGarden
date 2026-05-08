import fs from 'fs-extra';
import path from 'path';
import { and, eq, isNull } from 'drizzle-orm';

import type { ProviderType, ScrapedResource } from '@animegarden/client';

import type { System } from '../system/index.ts';
import { resources as resourceSchema } from '../schema/resources.ts';

import type { NewResource } from './types.ts';

const DUPLICATE_REPAIR_BATCH_SIZE = 1000;

export interface ImportResourcesOptions {
  dir?: string;

  provider?: string;

  batchSize?: number;

  start?: number;

  end?: number;
}

interface ImportFile {
  file: string;
  page?: number;
}

interface PagedImportFile extends ImportFile {
  page: number;
}

function parseImportFile(file: string): ImportFile {
  const match = /^(\d+)\.json$/.exec(file);
  return match
    ? {
        file,
        page: +match[1]
      }
    : {
        file
      };
}

function orderImportFiles(files: string[]): ImportFile[] {
  const pages = files
    .map(parseImportFile)
    .filter((file): file is PagedImportFile => file.page !== undefined)
    .sort((lhs, rhs) => rhs.page - lhs.page);

  const others = files
    .map(parseImportFile)
    .filter((file) => file.page === undefined)
    .sort((lhs, rhs) => lhs.file.localeCompare(rhs.file));

  return [...pages, ...others];
}

function filterImportFilesByPage(files: ImportFile[], options: ImportResourcesOptions) {
  if (options.start === undefined && options.end === undefined) {
    return files;
  }

  const minPage =
    options.start !== undefined && options.end !== undefined
      ? Math.min(options.start, options.end)
      : (options.start ?? Number.NEGATIVE_INFINITY);
  const maxPage =
    options.start !== undefined && options.end !== undefined
      ? Math.max(options.start, options.end)
      : (options.end ?? Number.POSITIVE_INFINITY);

  return files.filter(
    (file) => file.page !== undefined && file.page >= minPage && file.page <= maxPage
  );
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

async function maintainMikanUnduplicatedResources(sys: System) {
  const provider = 'mikan' as ProviderType;
  const rows = await sys.database
    .select({ id: resourceSchema.id })
    .from(resourceSchema)
    .where(and(eq(resourceSchema.provider, provider), isNull(resourceSchema.duplicatedId)));

  if (rows.length === 0) {
    return;
  }

  const totalBatches = Math.ceil(rows.length / DUPLICATE_REPAIR_BATCH_SIZE);
  let attached = 0;
  let detached = 0;

  sys.logger.info(
    `Start repairing duplicated markers for ${rows.length} ${provider} resources with null duplicated_id`
  );

  for (let offset = 0; offset < rows.length; offset += DUPLICATE_REPAIR_BATCH_SIZE) {
    const batchIndex = Math.floor(offset / DUPLICATE_REPAIR_BATCH_SIZE) + 1;
    const ids = rows.slice(offset, offset + DUPLICATE_REPAIR_BATCH_SIZE).map((row) => row.id);
    const duplicated = await sys.modules.resources.maintainDuplicatedResources(ids);

    attached += duplicated.attached.length;
    detached += duplicated.detached.length;

    sys.logger.info(
      `Repaired duplicated markers batch ${batchIndex}/${totalBatches}: ${duplicated.attached.length} attached, ${duplicated.detached.length} detached`
    );
  }

  sys.logger.info(
    `Finish repairing duplicated markers for ${provider}: ${attached} attached, ${detached} detached`
  );
}

export async function runImportResources(sys: System, options: ImportResourcesOptions) {
  if (!options.dir) {
    throw new TypeError(`Import dir does not exist`);
  }

  const inputDir = options.dir;
  if (!(await fs.pathExists(inputDir))) {
    throw new TypeError(`Import dir does not exist: ${inputDir}`);
  }

  const files = filterImportFilesByPage(
    orderImportFiles(
      (await fs.readdir(inputDir)).filter((file) => path.extname(file).toLowerCase() === '.json')
    ),
    options
  );
  if (files.length === 0) {
    if (options.start !== undefined || options.end !== undefined) {
      throw new TypeError(
        `No JSON page files found in ${inputDir} for range ${options.start ?? '*'} .. ${options.end ?? '*'}`
      );
    }
    throw new TypeError(`No JSON files found in ${inputDir}`);
  }

  const batchSize = Math.max(1, options.batchSize ?? 10);
  const totalBatches = Math.ceil(files.length / batchSize);
  let inserted = 0;
  let updated = 0;
  let attached = 0;
  let detached = 0;
  let errors = 0;

  if (options.start !== undefined || options.end !== undefined) {
    const pageFiles = files.filter((file) => file.page !== undefined);
    sys.logger.info(
      `Importing page range ${pageFiles[0]?.page} .. ${pageFiles.at(-1)?.page} from ${inputDir}`
    );
  }

  for (let offset = 0; offset < files.length; offset += batchSize) {
    const batchIndex = Math.floor(offset / batchSize) + 1;
    const batchFiles = files.slice(offset, offset + batchSize);

    sys.logger.info(
      `Importing batch ${batchIndex}/${totalBatches}: ${batchFiles[0]?.file} .. ${batchFiles.at(-1)?.file}`
    );

    const fetchedAt = new Date();
    const pages = await Promise.all(
      batchFiles.map(async (file) => {
        const content = await fs.readJSON(path.join(inputDir, file.file));
        if (!Array.isArray(content)) {
          throw new TypeError(
            `Import file is not a resource array: ${path.join(inputDir, file.file)}`
          );
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
