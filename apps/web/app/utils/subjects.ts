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

export function getSubjectDisplayName(
  bgm?: Pick<FullBangumi | BangumiItem | Jsonify<BangumiItem>, 'name' | 'bangumi'>
) {
  return bgm?.bangumi?.name_cn || bgm?.name || '';
}
