import type { FullBangumi } from 'bgmd/types';

import * as bgmd from 'bgmd' with { type: 'json' };

const bangumis = (bgmd as any).default.bangumis as typeof bgmd.bangumis;

const subjectIdMap = new Map(bangumis.map((bgm) => [bgm.id, bgm]));

const subjectNameMap = new Map<string, (typeof bangumis)[0]>();
for (const bgm of bangumis) {
  subjectNameMap.set(bgm.name, bgm);
  if (bgm.bangumi?.name_cn) {
    subjectNameMap.set(bgm.bangumi?.name_cn, bgm);
  }
}

export function getSubjectById(id: number) {
  return subjectIdMap.get(id);
}

export function getSubjectByName(name: string) {
  return subjectNameMap.get(name);
}

export function getSubjectDisplayName(bgm?: Pick<FullBangumi, 'name' | 'bangumi'>) {
  return bgm?.bangumi?.name_cn || bgm?.name || '';
}
