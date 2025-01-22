import type { System } from '../system';

import { connectDatabase } from '../legacy';

type LegacyDatabase = ReturnType<typeof connectDatabase>['database'];

interface TransferOptions {
  startPage?: number;
  endPage?: number;
  pageSize?: number;
  retry?: number;
}

export async function transferFromV1(
  sys: System,
  oldDatabaseName: string,
  options: TransferOptions = {}
) {
  const oldPostgresURI = sys.options.postgresUri!.replace(/\/(\w+)$/, '/' + oldDatabaseName);
  const { connection: oldConnection, database: oldDatabase } = connectDatabase(oldPostgresURI);

  await transferUsers(sys, oldDatabase);
  await transferTeams(sys, oldDatabase);
  await transferResources(sys, oldDatabase, options);

  await oldConnection.end();
}

async function transferUsers(sys: System, oldDatabase: LegacyDatabase) {
  sys.logger.info('Start transfering Users');
  const users = await oldDatabase.query.users.findMany();
  const newUsers = await sys.modules.users.insertUsers(users);
  sys.logger.info(`Insert or update ${newUsers.length} new users`);
  sys.logger.success('Finish transfering Users OK');
}

async function transferTeams(sys: System, oldDatabase: LegacyDatabase) {
  sys.logger.info('Start transfering Teams');
  const teams = await oldDatabase.query.teams.findMany();
  const newTeams = await sys.modules.teams.insertTeams(teams);
  sys.logger.info(`Insert or update ${newTeams.length} new teams`);
  sys.logger.success('Finish transfering Teams OK');
}

async function transferResources(
  sys: System,
  oldDatabase: LegacyDatabase,
  options: TransferOptions
) {
  const PAGE_SIZE = options.pageSize ?? 1000;
  const RETRY = options.retry ?? 5;
  if (PAGE_SIZE <= 0) {
    sys.logger.success('Skip transfering Resources');
    return;
  }

  sys.logger.info('Start transfering Resources');

  let cursor = options.startPage ?? 0;
  let end = options.endPage ?? Number.MAX_SAFE_INTEGER;

  while (cursor < end) {
    sys.logger.info(
      `Fetching resources from ${cursor * PAGE_SIZE} to ${cursor * PAGE_SIZE + PAGE_SIZE - 1}`
    );
    const oldResources = await oldDatabase.query.resources.findMany({
      with: {
        publisher: true,
        fansub: true
      },
      offset: cursor * PAGE_SIZE,
      limit: PAGE_SIZE,
      orderBy: (res, { asc }) => [asc(res.createdAt)]
    });
    if (oldResources.length === 0) break;

    for (let i = 0; i < RETRY; i++) {
      try {
        const { inserted, conflict, errors } = await sys.modules.resources.insertResources(
          oldResources.map((r) => ({
            provider: r.provider,
            providerId: r.providerId,
            title: r.title,
            href: r.href,
            type: SimpleType[r.type in DisplayType ? DisplayType[r.type] : r.type] ?? '动画',
            magnet: r.magnet,
            tracker: r.tracker,
            size: r.size,
            createdAt: r.createdAt!,
            fetchedAt: r.fetchedAt!,
            publisher: r.publisher?.name,
            fansub: r.fansub?.name,
            isDeleted: r.isDeleted
          })),
          {
            indexSubject: false
          }
        );

        sys.logger.info(`Insert ${inserted.length} new resources`);
        if (errors.length > 0) {
          sys.logger.warn(`Have ${errors.length} error resources`);
          for (const res of errors) {
            sys.logger.warn(`Error resource: ${res.title} (${res.provider} / ${res.providerId})`);
          }
        }
        if (conflict.length > 0) {
          sys.logger.warn(`Have ${conflict.length} conflict resources`);
          for (const res of conflict) {
            sys.logger.warn(
              `Conflict resource: ${res.title} (${res.provider} / ${res.providerId})`
            );
          }
        }
        cursor += 1;

        break;
      } catch (error) {
        if (i + 1 === RETRY) {
          throw error;
        } else {
          sys.logger.error(error);
        }
      }
    }
  }

  sys.logger.success('Finish transfering Resources OK');
}

const SimpleType: Record<string, string> = {
  动画: '动画',
  季度全集: '合集',
  音乐: '音乐',
  动漫音乐: '音乐',
  同人音乐: '音乐',
  流行音乐: '音乐',
  日剧: '日剧',
  RAW: 'RAW',
  其他: '其他',
  漫画: '漫画',
  港台原版: '漫画',
  日文原版: '漫画',
  游戏: '游戏',
  电脑游戏: '游戏',
  主机游戏: '游戏',
  掌机游戏: '游戏',
  网络游戏: '游戏',
  游戏周边: '游戏',
  特摄: '特摄'
};

const DisplayType: Record<string, string> = {
  動畫: '动画',
  季度全集: '季度全集',
  音樂: '音乐',
  動漫音樂: '动漫音乐',
  同人音樂: '同人音乐',
  流行音樂: '流行音乐',
  日劇: '日剧',
  ＲＡＷ: 'RAW',
  其他: '其他',
  漫畫: '漫画',
  港台原版: '港台原版',
  日文原版: '日文原版',
  遊戲: '游戏',
  電腦遊戲: '电脑游戏',
  電視遊戲: '主机游戏',
  掌機遊戲: '掌机游戏',
  網絡遊戲: '网络游戏',
  遊戲周邊: '游戏周边',
  特攝: '特摄'
};
