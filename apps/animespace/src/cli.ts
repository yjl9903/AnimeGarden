import 'dotenv/config';

import { breadc } from 'breadc';
import { setGlobalDispatcher, EnvHttpProxyAgent } from 'undici';

import { version } from '../package.json';

import { makeSystem } from './system/system';

const app = breadc('anime', { version, i18n: 'zh' }).use((ctx, next) => {
  const system = makeSystem();
  return next({ data: { system } });
});

app.command('watch').action(async () => {});

app.command('import <url>').action(async () => {});

// garden
const garden = app.group('garden');

garden.command('search').action(async () => {});

garden.command('detail <provider> <id>').action(async () => {});

garden.command('collection <id>').action(async () => {});

// bangumi
const bangumi = app.group('bangumi');

bangumi.command('search <text>').action(async () => {});

bangumi.command('subject <id>').action(async () => {});

bangumi.command('collection <id>').action(async () => {});

bangumi.command('index <id>').action(async () => {});

// storage
const storage = app.group('storage').option('--driver <name>');

storage
  .command('list <file>', '列出目录内容')
  .alias('ls')
  .action(async () => {});

storage
  .command('get <file>', '下载文件')
  .option('-o, --out <dst>', '输出到本地文件')
  .action(async () => {});

storage
  .command('put <file>', '上传文件')
  .option('-i, --input <src>', '待上传的本地文件')
  .action(async () => {});

storage
  .command('remove <file>', '删除文件')
  .alias('rm')
  .action(async () => {});

storage
  .command('move <src> <dst>', '移动文件')
  .alias('mv')
  .action(async () => {});

setGlobalDispatcher(new EnvHttpProxyAgent());

await app.run(process.argv.slice(2)).catch((err) => console.error(err));
