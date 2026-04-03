import type { SubjectInformation } from 'bgmc';

import YAML from 'yaml';
import { trimSeason } from 'bgmt';

import { formatDateTime } from '../utils/date.ts';

import type { BangumiCollectionFile, BangumiCollectionItem, UserCollection } from './types.ts';

export function createCollectionItem(subject: SubjectInformation): BangumiCollectionItem {
  const include = dedupeText([
    subject.name_cn,
    subject.name,
    ...getInfoboxValues(subject.infobox, '简体中文名'),
    ...getInfoboxValues(subject.infobox, '别名')
  ]);

  const name = getSubjectDisplayName(subject.name_cn, subject.name);
  if (!name) {
    throw new Error(`Bangumi 条目缺少标题: ${subject.id}`);
  }
  if (include.length === 0) {
    throw new Error(`Bangumi 条目缺少可用别名: ${subject.id}`);
  }

  const naming = resolveTrimmedNaming(name);

  return {
    name,
    bgm: subject.id,
    ...(naming ? { naming } : {}),
    source: {
      include
    }
  };
}

export function createCollectionFile(
  subjects: BangumiCollectionItem[],
  yearMonth: string,
  after?: string,
  before?: string
): BangumiCollectionFile {
  const [yearText, monthText] = yearMonth.split('-');
  const month = Number(monthText);

  const preference =
    after || before
      ? {
          animegarden: {
            ...(after ? { after: normalizeDateString(after) } : {}),
            ...(before ? { before: normalizeDateString(before) } : {})
          }
        }
      : undefined;

  return {
    name: `${yearText} 年 ${month} 月新番放送计划`,
    enabled: true,
    preference,
    subjects
  };
}

export function filterDateCollections(
  collections: UserCollection[],
  options: {
    after?: string;
    before?: string;
    onSkipMissingSubject?: (item: UserCollection) => void;
    onSkipMissingDate?: (item: UserCollection) => void;
  }
) {
  return collections
    .filter((item) => {
      if (!item.subject) {
        options.onSkipMissingSubject?.(item);
        return false;
      }

      if (!item.subject.date) {
        options.onSkipMissingDate?.(item);
        return false;
      }

      if (options.after && item.subject.date < options.after) {
        return false;
      }
      if (options.before && item.subject.date > options.before) {
        return false;
      }
      return true;
    })
    .sort((lhs, rhs) => {
      const leftDate = lhs.subject?.date ?? '';
      const rightDate = rhs.subject?.date ?? '';
      if (leftDate !== rightDate) {
        return leftDate.localeCompare(rightDate);
      }
      return lhs.subject_id - rhs.subject_id;
    });
}

export function renderBangumiCollectionYAML(collection: BangumiCollectionFile) {
  const yaml = YAML.stringify(collection, {
    lineWidth: 0,
    minContentWidth: 0
  });
  return applySpacing(yaml);
}

export function renderBangumiItemYAML(item: BangumiCollectionItem) {
  return YAML.stringify(item, {
    lineWidth: 0,
    minContentWidth: 0
  });
}

export function resolveYearMonth(after: string | undefined, before: string | undefined, now: Date) {
  if (after) {
    return inferCollectionYearMonth(after);
  }
  if (before) {
    return inferCollectionYearMonth(before);
  }
  return formatDateTime(now, 'yyyy-MM');
}

export function parseDateOption(name: string, value?: string) {
  if (value === undefined) {
    return undefined;
  }

  const text = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new Error(`Invalid --${name} date: ${value}`);
  }

  const [year, month, day] = text.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`Invalid --${name} date: ${value}`);
  }

  return text;
}

export function getSubjectDisplayName(nameCn?: string, name?: string) {
  return dedupeText([nameCn, name])[0];
}

function resolveTrimmedNaming(name: string) {
  const trimmed = trimSeason({
    name,
    alias: [name]
  }).original?.[0];

  if (!trimmed || trimmed === name) {
    return undefined;
  }

  return trimmed;
}

function inferCollectionYearMonth(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const remainingDays = daysInMonth - day;

  if (remainingDays < 7) {
    const nextMonth = new Date(Date.UTC(year, month, 1));
    return `${nextMonth.getUTCFullYear()}-${String(nextMonth.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  return `${year}-${String(month).padStart(2, '0')}`;
}

function normalizeDateString(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date value: ${value}`);
  }
  return date.toISOString();
}

function getInfoboxValues(infobox: SubjectInformation['infobox'], key: string) {
  const values: string[] = [];
  for (const item of infobox ?? []) {
    if (item.key !== key) {
      continue;
    }

    const value = item.value;
    if (typeof value === 'string') {
      values.push(value);
      continue;
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        if (typeof entry === 'string') {
          values.push(entry);
        } else if (entry && typeof entry === 'object' && 'v' in entry) {
          const text = entry.v;
          if (typeof text === 'string') {
            values.push(text);
          }
        }
      }
    }
  }
  return values;
}

function dedupeText(values: Array<string | undefined | null>) {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    if (typeof value !== 'string') {
      continue;
    }

    const text = value.trim();
    if (!text || seen.has(text)) {
      continue;
    }

    seen.add(text);
    result.push(text);
  }

  return result;
}

function applySpacing(yamlText: string) {
  const lines = yamlText.trimEnd().split('\n');

  const topSpaced: string[] = [];
  let seenTopLevel = false;
  for (const line of lines) {
    const isTopLevelKey = /^[^\s][^:]*:/.test(line);
    if (isTopLevelKey && seenTopLevel && topSpaced[topSpaced.length - 1] !== '') {
      topSpaced.push('');
    }
    topSpaced.push(line);
    if (isTopLevelKey) {
      seenTopLevel = true;
    }
  }

  const finalLines: string[] = [];
  let inSubjects = false;
  let seenSubject = false;
  for (const line of topSpaced) {
    if (/^subjects:/.test(line)) {
      inSubjects = true;
      seenSubject = false;
      finalLines.push(line);
      continue;
    }

    if (inSubjects && /^[^\s]/.test(line) && !/^subjects:/.test(line)) {
      inSubjects = false;
      seenSubject = false;
    }

    if (inSubjects && /^  - /.test(line)) {
      if (seenSubject && finalLines[finalLines.length - 1] !== '') {
        finalLines.push('');
      }
      seenSubject = true;
    }

    finalLines.push(line);
  }

  return (
    finalLines
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trimEnd() + '\n'
  );
}
