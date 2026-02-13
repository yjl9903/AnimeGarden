import 'dotenv/config';

import { breadc } from 'breadc';
import { setGlobalDispatcher, EnvHttpProxyAgent } from 'undici';

import { version, description } from '../package.json';

import { makeSystem } from './system/system.ts';
import { searchResources } from './command/animegarden.ts';

const app = breadc('anime', { version, description, i18n: 'zh' }).use(async (ctx, next) => {
  const system = await makeSystem();
  try {
    return await next({ data: { system } });
  } finally {
    system.close();
  }
});

app.command('watch', '拉取, 下载, 整理上传最新动画资源').action(async (options) => {});

app.command('download <url>', '下载, 整理上传资源').action(async () => {});

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
  .action(async (texts, options, context) => {
    return await searchResources(context.data.system, texts, options);
  });

garden.command('detail <provider> <id>', '显示资源详情').action(async () => {});

garden.command('collection <id>', '导入 Anime Garden 收藏夹').action(async () => {});

// bangumi
const bangumi = app.group('bangumi');

bangumi.command('search <text>', '搜索 bangumi 条目').action(async () => {});

bangumi.command('subject <id>', '显示 bangumi 条目详情').action(async () => {});

bangumi.command('collection <id>', '导入 bangumi 用户收藏夹').action(async () => {});

bangumi.command('index <id>', '导入 bangumi 目录').action(async () => {});

// storage
const storage = app.group('storage').option('--storage <name>');

storage
  .command('list <file>', '列出目录内容')
  .alias('ls')
  .action(async (file, options, context) => {
    const system = context.data.system;
    await system.validateStorage();
    const driver = system.space.storage[options.storage || 'default'];
    if (!driver) {
      throw new Error(`Storage "${options.storage}" is not existed`);
    }

    if (file.startsWith('../')) {
      throw new Error(`Path "${file}" is invalid`);
    }

    const filepath = driver.join(file);

    const content = await filepath.list();
    for (const file of content) {
      system.logger.log(`- ${file.path}`);
    }
  });

storage
  .command('get <file>', '下载文件')
  .option('-o, --output <dst>', '输出到本地文件')
  .action(async (file, options, context) => {
    const system = context.data.system;
    await system.validateStorage();

    // TODO
  });

storage
  .command('put <file>', '上传文件')
  .option('-i, --input <src>', '待上传的本地文件')
  .action(async (file, options, context) => {
    const system = context.data.system;
    await system.validateStorage();

    // TODO
  });

storage
  .command('remove <file>', '删除文件')
  .alias('rm')
  .action(async (file, options, context) => {
    const system = context.data.system;
    await system.validateStorage();

    // TODO
  });

storage
  .command('move <src> <dst>', '移动文件')
  .alias('mv')
  .option('--input-driver <driver>', '源路径所属 driver')
  .option('--output-driver <driver>', '目标路径所属 driver')
  .action(async (src, dst, options, context) => {
    const system = context.data.system;
    await system.validateStorage();

    // TODO
  });

setGlobalDispatcher(new EnvHttpProxyAgent());

await app.run(process.argv.slice(2)).catch((err) => console.error(err));
