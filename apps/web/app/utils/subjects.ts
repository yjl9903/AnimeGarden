import type { Jsonify } from '@animegarden/client';
import type { FullBangumi } from 'bgmd/types';

export type BangumiItem = Omit<FullBangumi, 'summary'>;

export type FullBangumiItem = FullBangumi;

const subjectIdMap = new Map<number, BangumiItem>();
const subjectNameMap = new Map<string, BangumiItem>();

const loadPromise = new Promise(async (res) => {
  try {
    const { bangumis } = import.meta.env.SSR ? await import('bgmd/full') : await import('bgmd');

    for (const bgm of bangumis) {
      subjectIdMap.set(bgm.id, bgm);
      if (bgm.bangumi?.name_cn) {
        subjectNameMap.set(bgm.bangumi?.name_cn, bgm);
      }
      subjectNameMap.set(bgm.name, bgm);
      if (bgm.bangumi?.name_cn) {
        subjectNameMap.set(bgm.bangumi?.name_cn, bgm);
      }
    }

    res(undefined);
  } catch (error) {
    console.error(error);
    res(undefined);
  }
});

if (import.meta.env.SSR) {
  await loadPromise;
}

export async function waitForSubjectsLoaded() {
  return await loadPromise;
}

export function getSubjectById(id: number) {
  return subjectIdMap.get(id);
}

export function getSubjectByName(name: string) {
  return subjectNameMap.get(name);
}

export function searchSubjects(keywords: string[]) {
  return Array.from(subjectIdMap.values())
    .reverse()
    .filter((bgm) => {
      return keywords.some((keyword) => {
        return (
          bgm.name.includes(keyword) ||
          bgm.bangumi?.name_cn?.includes(keyword) ||
          bgm.alias?.some((alias) => alias.includes(keyword))
        );
      });
    });
}

export function getSubjectDisplayName(
  bgm?: Pick<FullBangumi | BangumiItem | Jsonify<BangumiItem>, 'name' | 'bangumi'>
) {
  return bgm?.bangumi?.name_cn || bgm?.name || '';
}

export function getAllSubjectNames(bgm?: Pick<FullBangumi, 'name' | 'bangumi' | 'alias'>) {
  if (!bgm) return [];
  return [...new Set([bgm.name, bgm.bangumi?.name_cn, ...bgm.alias].filter(Boolean))];
}

export function getSubjectURL(bgm: Pick<FullBangumi, 'id'>) {
  return `/subject/${bgm.id}`;
}
