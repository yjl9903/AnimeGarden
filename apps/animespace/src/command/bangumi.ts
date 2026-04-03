import path from 'node:path';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';

import { BgmClient } from 'bgmc';
import { dim } from 'breadc';
import prompts from 'prompts';

import type { System } from '../system/system.ts';
import type {
  BangumiCollectionFile,
  BangumiCollectionItem,
  SearchSubject
} from '../bangumi/types.ts';

import { makeBgmClient, searchAnimeSubjects, fetchUserCollections } from '../bangumi/client.ts';
import {
  createCollectionFile,
  createCollectionItem,
  filterDateCollections,
  getSubjectDisplayName,
  parseDateOption,
  renderBangumiCollectionYAML,
  renderBangumiItemYAML,
  resolveYearMonth
} from '../bangumi/transform.ts';

export interface BangumiSearchOptions {
  json?: boolean;
}

export interface BangumiCollectionOptions {
  uid?: string | number;
  status?: string;
  after?: string;
  before?: string;
  dump?: boolean | string;
  json?: boolean;
}

export interface SearchBangumiDeps {
  client?: BgmClient;
  isTTY?: boolean;
  selectSubjectIndex?: (candidates: SearchSubject[], system: System) => Promise<number>;
}

export interface CollectBangumiDeps {
  client?: BgmClient;
  now?: Date;
}

export async function searchBangumi(
  system: System,
  text: string,
  options: BangumiSearchOptions,
  deps: SearchBangumiDeps = {}
) {
  const client = deps.client ?? makeBgmClient();
  const candidates = await searchAnimeSubjects(client, text);
  if (candidates.length === 0) {
    throw new Error(`未找到相关 bangumi 动画条目: ${text}`);
  }

  let selected = candidates[0]!;
  if (candidates.length > 1) {
    const isTTY = deps.isTTY ?? !!system.logger.stream.isTTY;
    if (!isTTY) {
      throw new Error('bangumi search 仅支持交互选择。');
    }

    const selector = deps.selectSubjectIndex ?? promptSubjectIndex;
    const index = await selector(candidates, system);
    selected = candidates[index]!;
  }

  const subject = await client.subject(selected.id);
  const item = createCollectionItem(subject);
  printBangumiValue(system, item, options.json);

  return item;
}

export async function importBangumiCollection(
  system: System,
  options: BangumiCollectionOptions,
  deps: CollectBangumiDeps = {}
) {
  const client = deps.client ?? makeBgmClient();
  const uid = resolveBangumiUid(system, options.uid);
  const collectionType = resolveCollectionType(options.status);
  const after = parseDateOption('after', options.after);
  const before = parseDateOption('before', options.before);

  const collections = await fetchUserCollections(client, uid, collectionType);
  const filtered = filterDateCollections(collections, {
    after,
    before,
    onSkipMissingSubject(_item) {
      // system.logger.log(`跳过未返回条目详情的 Bangumi 收藏: ${item.subject_id}`);
    },
    onSkipMissingDate(_item) {
      // system.logger.log(`跳过缺少放送日期的 Bangumi 条目: ${item.subject_id}`);
    }
  });

  const details = await Promise.all(filtered.map((item) => client.subject(item.subject_id)));
  const subjects = details.map((subject) => createCollectionItem(subject));

  const yearMonth = resolveYearMonth(after, before, deps.now ?? new Date());
  const collection = createCollectionFile(subjects, yearMonth, after, before);
  const yaml = renderBangumiCollectionYAML(collection);

  let dumpPath: string | undefined;
  if (options.dump) {
    const resolvedDumpPath = resolveDumpPath(system, options.dump, yearMonth);
    await ensureFileNotExists(resolvedDumpPath);
    await mkdir(path.dirname(resolvedDumpPath), { recursive: true });
    await writeFile(resolvedDumpPath, yaml, 'utf8');
    dumpPath = resolvedDumpPath;
  }

  if (dumpPath && !options.json) {
    system.logger.log(dim(`已写入 ${dumpPath}`));
    system.logger.log();
  }

  printBangumiValue(system, collection, options.json, yaml);

  return {
    uid,
    collection,
    dumpPath,
    yaml
  };
}

export function resolveBangumiUid(system: System, uid?: string | number) {
  const value = uid ?? system.space.bangumi?.uid;
  if (value === undefined || value === null) {
    throw new Error('缺少 Bangumi UID，请通过 --uid 指定或在 anime.yaml 中配置 bangumi.uid。');
  }

  const text = String(value).trim();
  if (!text) {
    throw new Error('Bangumi UID 不能为空。');
  }
  return text;
}

export function resolveCollectionType(status?: string): 1 | 2 | 3 | 4 | 5 {
  if (status === undefined) {
    return 3;
  }

  const value = status.trim().toLowerCase();
  switch (value) {
    case '1':
    case 'wish':
    case '想看':
      return 1;
    case '2':
    case 'collect':
    case '看过':
      return 2;
    case '3':
    case 'doing':
    case 'do':
    case '在看':
      return 3;
    case '4':
    case 'on_hold':
    case 'on-hold':
    case 'hold':
    case '搁置':
      return 4;
    case '5':
    case 'dropped':
    case 'drop':
    case '抛弃':
      return 5;
    default:
      throw new Error(`不支持的 Bangumi 收藏类型: ${status}`);
  }
}

export function resolveDumpPath(system: System, dump: boolean | string, yearMonth: string) {
  if (dump === true) {
    return path.resolve(system.space.root.path, 'collections', `${yearMonth}.yaml`);
  }
  if (typeof dump !== 'string') {
    throw new Error('`--dump` 参数无效。');
  }

  const target = dump.trim();
  if (!target) {
    throw new Error('`--dump` 文件名不能为空。');
  }

  return path.isAbsolute(target) ? target : path.resolve(system.space.root.path, target);
}

async function promptSubjectIndex(candidates: SearchSubject[], system: System) {
  const response = await prompts(
    {
      type: 'select',
      name: 'index',
      message: '请选择 Bangumi 条目',
      choices: candidates.map((item, index) => ({
        title: getSubjectDisplayName(item.name_cn, item.name) ?? '未命名条目',
        description: [item.date ?? '', `#${item.id}`].filter(Boolean).join('  '),
        value: index
      }))
    },
    {
      onCancel() {
        throw new Error('已取消 Bangumi 条目选择。');
      }
    }
  );

  if (!Number.isInteger(response.index)) {
    throw new Error('未选择有效的 Bangumi 条目。');
  }

  return response.index as number;
}

function printBangumiValue(
  system: System,
  value: BangumiCollectionItem | BangumiCollectionFile,
  json = false,
  yamlText?: string
) {
  if (json) {
    system.logger.log(JSON.stringify(value, null, 2));
    return;
  }

  const text =
    yamlText ??
    ('subjects' in value ? renderBangumiCollectionYAML(value) : renderBangumiItemYAML(value));
  system.logger.log(text.trimEnd());
}

async function ensureFileNotExists(file: string) {
  try {
    await access(file, fsConstants.F_OK);
    throw new Error(`目标文件已存在: ${file}`);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException | undefined)?.code;
    if (code === 'ENOENT') {
      return;
    }
    throw error;
  }
}
