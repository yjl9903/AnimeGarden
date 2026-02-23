import { eq } from 'drizzle-orm';
import { bold, lightBlue, lightGreen, lightRed, lightYellow, link } from 'breadc';

import type { Subject } from '../subject/subject.ts';
import type { System, PushOptions, PullOptions } from '../system/system.ts';

import { splitArray } from '../utils/array.ts';
import { getInfoHash } from '../utils/torrent.ts';
import { getSourceURL, nameResource } from '../subject/source/extract.ts';
import { DownloadRequest } from '../download/torrent.ts';
import { subjectFiles as subjectFilesSchema } from '../sqlite/subject.ts';

import { printList } from './tui.ts';
import { printSource } from './subject.ts';

export async function pushSubjects(system: System, subjects: Subject[], options: PushOptions = {}) {
  const tasks: Array<{ subject: Subject; promise: Promise<void> }> = [];

  try {
    system.logger.log(lightBlue('开始推送 Anime Space 更新'));
    system.logger.log();

    await system.initializeSource();

    for (const subject of subjects) {
      const task = await pushSubject(subject);
      if (task) {
        tasks.push(task);
      }
    }

    system.logger.log(lightGreen(`抓取动画资源完成`));
    system.logger.log();
  } catch (error) {
    system.logger.log(lightRed('推送 Anime Space 更新失败'));
    system.logger.error(error);
    system.logger.log();
  }

  return tasks;
}

export async function pullSubjects(system: System, subjects: Subject[], options: PullOptions = {}) {
  try {
    system.logger.log(lightBlue('开始同步 Anime Space 存储快照'));
    system.logger.log();

    await system.initializeSource();

    for (const subject of subjects) {
      await pullSubject(subject, options);
    }

    system.logger.log(lightGreen('成功同步 Anime Space 存储快照'));
    system.logger.log();
  } catch (error) {
    system.logger.log(lightRed('同步存储 Anime Space 快照失败'));
    system.logger.error(error);
    system.logger.log();
  }
}

async function pushSubject(subject: Subject) {
  const { system } = subject;

  system.logger.log(`${lightBlue('抓取资源')}  ${bold(subject.name)}`);
  printSource(system, subject);
  const fetched = await subject.fetchResources();
  const extracted = await subject.extractResources(fetched);
  const [downloaded, toDownload] = splitArray(extracted, (r) => !!r.subjectFiles);
  system.logger.log(
    `${lightBlue('存储快照')}  已下载 ${downloaded.length} 条资源 (${link(`已抓取 ${extracted.length} 条`, getSourceURL(subject) || '')})`
  );

  if (toDownload.length > 0) {
    const requests: DownloadRequest[] = [];
    for (const res of toDownload) {
      if (res.magnet) {
        system.logger.log(`${lightYellow('开始下载')}  ${link(res.extracted.filename, res.url)}`);
        requests.push({
          infoHash: getInfoHash(res.magnet),
          magnet: res.magnet,
          subject,
          resource: res
        });
      } else {
        system.logger.log(`${lightRed('未知资源')}  ${link(res.extracted.filename, res.url)}`);
      }
    }

    system.logger.log();

    return {
      subject,
      promise: (async () => {
        // 1. Submit torrents to downloader
        const tickets = await system.managers.downloader.submit(requests);

        const uploading: Promise<void>[] = [];

        for await (const event of system.managers.downloader.waitForSubject(subject)) {
          uploading.push(
            (async () => {
              // 2. Wait for torrents downloaded
              const ticket = tickets.find((t) => t.infoHash === event.infoHash);
              const detail = await system.managers.downloader.getTorrentDetail(event.infoHash);
              if (!ticket || !detail || detail.files.length === 0) {
                system.logger.error(`${lightRed('未知种子')}  ${event.infoHash}`);
                return;
              }
              // 3. Upload files
              try {
                await system.managers.storage.upload(subject, ticket.resource, detail);
              } catch (error) {
                system.logger.error(error);
              }
            })()
          );
        }

        await Promise.all(uploading);
      })()
    };
  } else {
    system.logger.log();
  }
}

async function pullSubject(subject: Subject, options: PullOptions) {
  const { system } = subject;

  system.logger.log(`${lightBlue('同步快照')}  ${bold(subject.name)}`);
  printSource(system, subject);
  const fetched = (await subject.fetchResources()).map((res) => nameResource(subject, res));
  const extracted = await subject.extractResources(fetched);
  system.logger.log(
    `${lightBlue('成功抓取')}  ${link(`共 ${fetched.length} 条资源`, getSourceURL(subject) || '')}`
  );

  const subjectId = (await subject.getSubject()).id;
  const subjectFiles = await subject.getSubjectFiles();
  const storageFiles = (
    await subject
      .getStorage()
      .list()
      .catch(() => [])
  ).filter((file) => ['.mp4', '.mkv', '.ass'].includes(file.extname));
  system.logger.log(
    `${lightBlue('快照状态')}  本地已同步 ${subjectFiles.length} 个文件 (共 ${storageFiles.length} 个文件)`
  );

  const database = await system.openDatabase();

  for (const subjectFile of subjectFiles) {
    if (!storageFiles.some((storageFile) => subjectFile.path === storageFile.path)) {
      system.logger.log(`${lightRed('删除快照')}  ${subjectFile.path}`);
      await database.delete(subjectFilesSchema).where(eq(subjectFilesSchema.id, subjectFile.id));
    }
  }

  const unknown: typeof storageFiles = [];

  for (const storageFile of storageFiles) {
    if (
      fetched.some(
        (res) =>
          res.subjectFiles &&
          res.subjectFiles.some((subjectFile) => subjectFile.path === storageFile.path)
      )
    ) {
      continue;
    }

    const bound =
      extracted.find((res) => storageFile.basename.startsWith(res.extracted.filename)) ||
      fetched.find((res) => storageFile.basename.startsWith(res.extracted.filename));

    if (bound) {
      const stat = await storageFile.stat();

      system.logger.log(
        `${lightGreen('绑定快照')}  ${storageFile.path} -> ${link(bound.name, bound.url)}`
      );

      await database.insert(subjectFilesSchema).values([
        {
          subjectId,
          storage: subject.storage.driver,
          path: storageFile.path,
          size: Number(stat.size),
          checksum: '',
          resource: { ...bound, subjectFiles: undefined },
          animegardenProvider: bound.animegarden?.provider,
          animegardenProviderId: bound.animegarden?.providerId,
          torrentInfoHash: bound.animegarden ? getInfoHash(bound.animegarden.magnet) : undefined,
          torrentFilePath: undefined
        }
      ]);

      continue;
    }

    unknown.push(storageFile);
  }

  system.logger.log();

  if (unknown.length > 0) {
    system.logger.log(`${lightRed('抓取文件')}`);
    printList(
      system,
      extracted,
      (item) => {
        return `${link(item.extracted.filename, item.url)}`;
      },
      (item) => {
        return `${item.extracted.filename}`;
      }
    );
    system.logger.log();

    system.logger.log(`${lightRed('未知文件')}`);
    printList(
      system,
      unknown,
      (item) => {
        return `${item.path}`;
      },
      (item) => {
        return `${item.path}`;
      }
    );
    system.logger.log();
  }
}
