import type { FullSubject } from 'bgmd';

type SubjectIndex = {
  subjects: FullSubject[];
  subjectsById: Map<number, FullSubject>;
  subjectsByName: Map<string, FullSubject>;
};

let subjectIndex: Promise<SubjectIndex> | undefined;

function normalizeTexts(texts: string[]) {
  return [...new Set(texts.map((text) => text.trim()).filter(Boolean))];
}

async function getSubjectIndex() {
  subjectIndex ??= import('bgmd/full').then(({ default: bgmd }) => {
    const subjects = [...bgmd.subjects].sort((a, b) => b.id - a.id) as FullSubject[];
    const subjectsByName = new Map<string, FullSubject>();

    for (const subject of subjects) {
      for (const name of [subject.title, ...subject.search.include]) {
        if (!subjectsByName.has(name)) subjectsByName.set(name, subject);
      }
    }

    return {
      subjects,
      subjectsById: new Map(subjects.map((subject) => [subject.id, subject])),
      subjectsByName
    };
  });

  return subjectIndex;
}

export async function getSubjectById(subjectId: number) {
  return (await getSubjectIndex()).subjectsById.get(subjectId);
}

export async function resolveSubjectsByName(names: string[]) {
  const { subjectsByName } = await getSubjectIndex();
  return normalizeTexts(names).flatMap((name) => subjectsByName.get(name) ?? []);
}

export async function resolveSubjectByName(name: string) {
  return (await getSubjectIndex()).subjectsByName.get(name.trim());
}

export async function searchSubjects(keyword: string, limit: number) {
  const normalizedKeyword = keyword.trim();
  if (!normalizedKeyword) return [];

  return (await getSubjectIndex()).subjects
    .filter(
      (subject) =>
        subject.title.includes(normalizedKeyword) ||
        subject.search.include.some((include) => include.includes(normalizedKeyword))
    )
    .slice(0, limit);
}

export async function getCalendar() {
  return (await import('bgmd/calendar')).calendar;
}
