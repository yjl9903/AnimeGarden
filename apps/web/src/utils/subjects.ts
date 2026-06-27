import type { BasicSubject, FullSubject } from 'bgmd';

const subjectIdMap = new Map<number, BasicSubject>();
const subjectNameMap = new Map<string, BasicSubject>();

const loadPromise = new Promise(async (res) => {
  try {
    const bgmd = import.meta.env.SSR ? await import('bgmd/full') : await import('bgmd');

    const subjects = bgmd.default.subjects.sort((a, b) => a.id - b.id);

    for (const bgm of subjects) {
      subjectIdMap.set(bgm.id, bgm);
      subjectNameMap.set(bgm.title, bgm);
      for (const include of bgm.search.include) {
        subjectNameMap.set(include, bgm);
      }
    }

    res(subjects.length);
  } catch (error) {
    console.error('[web]', 'load subjects failed', error);
    res(undefined);
  }
});

if (import.meta.env.SSR) {
  await loadPromise;
}

export async function waitForSubjectsLoaded() {
  return await loadPromise;
}

export function getSubjectById(id: number): FullSubject | undefined {
  return subjectIdMap.get(id) as any;
}

export function getSubjectByName(name: string): FullSubject | undefined {
  return subjectNameMap.get(name) as any;
}

export function searchSubjects(keywords: string[]) {
  return Array.from(subjectIdMap.values())
    .reverse()
    .filter((bgm) => {
      return keywords.some((keyword) => {
        return (
          bgm.title.includes(keyword) ||
          bgm.search.include.some((include) => include.includes(keyword))
        );
      });
    });
}

export function getSubjectDisplayName(bgm?: BasicSubject) {
  return bgm?.title || '';
}

export function getAllSubjectNames(bgm?: BasicSubject) {
  if (!bgm) return [];
  return [...new Set([bgm.title, ...bgm.search.include].filter(Boolean))];
}

export function getSubjectURL(bgm: Pick<BasicSubject, 'id'>) {
  return `/subject/${bgm.id}`;
}
