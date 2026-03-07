import path from 'node:path';
import createDebug from 'debug';
import { eq, sql } from 'drizzle-orm';
import { lightYellow, lightGreen, lightRed, link } from 'breadc';
import { type Queue, newQueue } from '@animegarden/shared';

import type { System } from '../system/system.ts';
import type { TorrentDetail } from '../download/torrent.ts';

import { LocalFS } from '../utils/fs.ts';
import { getInfoHash } from '../utils/torrent.ts';
import { formatBytes } from '../utils/bytes.ts';
import { subjectFiles } from '../sqlite/subject.ts';

import type { Subject } from './subject.ts';
import type { ExtractedSubjectResource } from './source/resource.ts';

const debug = createDebug('animespace:storage');

export class StorageManager {
  private readonly queues: Record<string, Queue>;

  public constructor(public readonly system: System) {
    this.queues = Object.fromEntries(
      Object.entries(system.space.storage).map(([key, storage]) => [
        key,
        newQueue(storage.fs.provider.name === 'node' ? 10 : 1)
      ])
    );
  }

  public close() {}

  public async upload(subject: Subject, resource: ExtractedSubjectResource, detail: TorrentDetail) {
    await subject.getStorage().ensureDir();

    const database = await this.system.openDatabase();

    const toReplaced = (await subject.getSubjectFiles()).filter(
      (sf) =>
        sf.resource &&
        sf.resource.extracted.season === resource.extracted.season &&
        sf.resource.extracted.episode === resource.extracted.episode
    );

    if (toReplaced.length) {
      for (const oldSubjectFile of toReplaced) {
        const queue = this.queues[oldSubjectFile.storage];
        if (!queue) continue;

        const oldPath = this.system.space.storage[oldSubjectFile.storage].fs.path(
          oldSubjectFile.path
        );

        if (
          toReplaced.length === 1 &&
          detail.files.length === 1 &&
          oldSubjectFile.checksum &&
          detail.files[0].checksum &&
          oldSubjectFile.checksum === detail.files[0].checksum
        ) {
          this.system.logger.log(lightGreen(`重复上传  ${link(oldPath.basename, resource.url)}`));
          await database
            .update(subjectFiles)
            .set({
              resource: { ...resource, subjectFiles: undefined }
            })
            .where(eq(subjectFiles.id, oldSubjectFile.id));
          return;
        }

        await queue.add(async () => {
          this.system.logger.log(`${lightRed(`删除文件`)}  ${oldPath.toString()}`);
          await oldPath.remove();
          await database.delete(subjectFiles).where(eq(subjectFiles.id, oldSubjectFile.id));
        });
      }
    }

    if (detail.files.length === 1) {
      const file = detail.files[0];
      const src = LocalFS.path(detail.savePath, file.name);
      const dstName = resource.extracted.filename + path.extname(file.name);
      const dst = subject.getStorage().join(dstName);

      const queue = this.queues[subject.storage.driver];

      debug('upload file', file, resource);
      debug('upload src', src);
      debug('upload dst', dst.fs.provider.name, dst.path);

      return queue.add(async () => {
        const MAX_RETRY = 3;

        for (let i = 0; i < MAX_RETRY; i++) {
          const retry = i > 0 ? ` (重试 ${i + 1} / ${MAX_RETRY})` : '';
          this.system.logger.log(
            `${lightYellow(`开始上传`)}  ${link(dstName, resource.url)}${retry}`
          );

          const handle = this.system.logger.progress(`上传 ${link(dstName, resource.url)}`, {
            width: 40,
            template: ['', '{message}', '{bar}{percent}{size}'],
            fields: {
              percent(ctx) {
                if (typeof ctx.state.value === 'number' && typeof ctx.state.total === 'number') {
                  const percent = Math.floor(
                    Math.min(
                      Math.max(0, +((ctx.state.value / ctx.state.total) * 100).toFixed(1)),
                      100
                    )
                  );
                  return ` ${percent}%`;
                }
                return '';
              },
              size(ctx) {
                if (!ctx.state.value || !ctx.state.total) {
                  return '';
                }
                return ` | ${formatBytes(ctx.state.value)} / ${formatBytes(ctx.state.total)}`;
              }
            }
          });

          try {
            const buffer = await src.readFile();
            await dst.writeFile(buffer, {
              onProgress: (payload) => {
                handle.setState({ value: payload.current, total: payload.total });
              }
            });

            handle.remove();

            await database
              .insert(subjectFiles)
              .values({
                subjectId: (await subject.getSubject()).id,
                storage: subject.storage.driver,
                path: dst.path,
                size: file.size,
                checksum: file.checksum || '',
                resource: { ...resource, subjectFiles: undefined },
                animegardenProvider: resource.animegarden?.provider,
                animegardenProviderId: resource.animegarden?.providerId,
                torrentInfoHash: resource.magnet ? getInfoHash(resource.magnet) : undefined,
                torrentFilePath: file.name
              })
              .onConflictDoUpdate({
                target: [subjectFiles.storage, subjectFiles.path],
                set: {
                  size: file.size,
                  checksum: file.checksum || '',
                  resource: sql`excluded.resource`,
                  animegardenProvider: resource.animegarden?.provider,
                  animegardenProviderId: resource.animegarden?.providerId,
                  torrentInfoHash: resource.magnet ? getInfoHash(resource.magnet) : undefined,
                  torrentFilePath: file.name
                }
              });

            this.system.logger.log(`${lightGreen(`成功上传`)}  ${link(dstName, resource.url)}`);

            break;
          } catch (error) {
            handle.remove();

            if (i + 1 === MAX_RETRY) {
              this.system.logger.log(`${lightRed(`上传失败`)}  ${link(dstName, resource.url)}`);
              throw error;
            } else {
              debug(error);
            }
          }
        }
      });
    } else {
      this.system.logger.error(`种子内容解析失败  ${link(resource.name, resource.url)}`);
    }
  }
}
