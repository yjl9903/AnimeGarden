import { bangumis } from 'bgmd';

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
