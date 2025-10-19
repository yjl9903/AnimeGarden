import type { BasicSubject } from 'bgmd';

import bgmd from 'bgmd' with { type: 'json' };

const bangumis = bgmd.subjects;

const subjectIdMap = new Map(bangumis.map((bgm) => [bgm.id, bgm]));

const subjectNameMap = new Map<string, (typeof bangumis)[0]>();
for (const bgm of bangumis) {
  subjectNameMap.set(bgm.title, bgm);
}

export function getSubjectById(id: number) {
  return subjectIdMap.get(id);
}

export function getSubjectByName(name: string) {
  return subjectNameMap.get(name);
}

export function getSubjectDisplayName(bgm?: Pick<BasicSubject, 'title'>) {
  return bgm?.title || '';
}
