import 'dotenv/config';

import { breadc } from 'breadc';
import { setGlobalDispatcher, EnvHttpProxyAgent } from 'undici';

import { version, description } from '../package.json';

import { makeSystem } from './system/system.ts';
import { searchResources } from './command/animegarden.ts';
import {
  listStorage,
  getStorage,
  putStorage,
  removeStorage,
  moveStorage
} from './command/storage.ts';
import { printSpace } from './command/space.ts';
import {
  getSubjects,
  getSubject,
  printParsedResources,
  printExtractedResources
} from './command/subject.ts';

const app = breadc('anime', { version, description, i18n: 'zh' })
  .option('-C, --dir <path>', '指定配置文件目录')
  .use(async (ctx, next) => {
    const dir = ctx.options.get('dir')?.value();
    const system = await makeSystem(typeof dir === 'string' ? dir : undefined);
    try {
      return await next({ data: { system } });
    } finally {
      system.close();
    }
  });

app.command('watch', '拉取, 下载, 上传所有动画资源').action(async (options, context) => {
  const { system } = context.data;
  printSpace(system);

  return await system.watchSubjects({});
});

app.command('introspect', '同步存储状态到本地').action(async (options, context) => {
  const { system } = context.data;
  printSpace(system);

  const subjects = await getSubjects(system, {});
  return await system.introspectSubjects(subjects);
});

app.command('download <url>', '下载资源').action(async (url, options, context) => {
  const { system } = context.data;
});

const subject = app
  .group('subject')
  .option('-n, --name <string>', '目标动画条目名称')
  .option('--bgm <id>', 'Bangumi 条目 id');

subject.command('refresh', '拉取, 下载, 上传动画资源').action(async (options, context) => {
  const { system } = context.data;
  printSpace(system);

  const subject = await getSubject(system, options);
  return await system.refreshSubjects([subject]);
});

subject
  .command('resources', '显示动画资源列表')
  .option('--full', '显示解析前的完整资源列表')
  .option('--json', '输出 JSON 格式')
  .action(async (options, context) => {
    const { system } = context.data;
    const subject = await getSubject(system, options);
    const resources = await subject.fetchResources();
    if (options.full) {
      printParsedResources(system, subject, resources, options);
      return resources;
    } else {
      const extracted = await subject.extractResources(resources);
      printExtractedResources(system, subject, extracted, options);
      return extracted;
    }
  });

subject
  .command('files', '显示动画资源目录')
  .option('--json', '输出 JSON 格式')
  .action(async (options, context) => {
    const { system } = context.data;
    const subject = await getSubject(system, options);

    // TODO
  });

subject
  .command('upload', '上传动画资源')
  .option('-i, --input <file>', '待上传文件')
  .option('--url', 'Anime Garden 链接, 磁力链接, 种子链接')
  .action(async (options, context) => {
    const { system } = context.data;
    const subject = await getSubject(system, options);

    // TODO
  });

// garden
const garden = app.group('garden');

garden
  .command('search [...text]', '搜索动画资源')
  .alias('')
  .option('--type <type>', '按资源类型过滤')
  .option('--after <date>', '资源上传时间起点')
  .option('--before <date>', '资源上传时间终点')
  .option('--limit <count>', '展示数量, 默认: 20')
  .option('--refresh', '强制刷新缓存')
  .option('--json', '输出 JSON 格式')
  .action(async (texts, options, context) => {
    return await searchResources(context.data.system, texts, options);
  });

garden
  .command('detail <provider> <id>', '显示资源详情')
  .option('--json', '输出 JSON 格式')
  .action(async () => {});

garden
  .command('collection <id>', '导入 Anime Garden 收藏夹')
  .option('--json', '输出 JSON 格式')
  .action(async () => {});

// bangumi
const bangumi = app.group('bangumi');

bangumi
  .command('search <text>', '搜索 bangumi 条目')
  .option('--json', '输出 JSON 格式')
  .action(async () => {});

bangumi
  .command('subject <id>', '显示 bangumi 条目详情')
  .option('--json', '输出 JSON 格式')
  .action(async () => {});

bangumi
  .command('collection <id>', '导入 bangumi 用户收藏夹')
  .option('--json', '输出 JSON 格式')
  .action(async () => {});

bangumi
  .command('index <id>', '导入 bangumi 目录')
  .option('--json', '输出 JSON 格式')
  .action(async () => {});

// storage
const storage = app.group('storage').option('-s, --storage <name>');

storage
  .command('list [file]', '列出目录内容')
  .alias('ls')
  .option('--json', '输出 JSON 格式')
  .action(async (file, options, context) => {
    await context.data.system.validateStorage();
    return await listStorage(context.data.system, file, options);
  });

storage
  .command('get <file>', '下载文件')
  .option('-o, --output <dst>', '输出到本地文件')
  .action(async (file, options, context) => {
    return await getStorage(context.data.system, file, options);
  });

storage
  .command('put <file>', '上传文件')
  .option('-i, --input <src>', '待上传的本地文件')
  .action(async (file, options, context) => {
    return await putStorage(context.data.system, file, options);
  });

storage
  .command('remove <file>', '删除文件')
  .alias('rm')
  .action(async (file, options, context) => {
    return await removeStorage(context.data.system, file, options);
  });

storage
  .command('move <src> <dst>', '移动文件')
  .alias('mv')
  .option('--src-storage <driver>', '源路径所属 driver')
  .option('--dst-storage <driver>', '目标路径所属 driver')
  .action(async (src, dst, options, context) => {
    return await moveStorage(context.data.system, src, dst, options);
  });

setGlobalDispatcher(new EnvHttpProxyAgent());

await app.run(process.argv.slice(2)).catch((err) => console.error(err));
