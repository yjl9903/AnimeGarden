export type SubjectInfo = {
  id: number;
  title: string;
  search: {
    include: string[];
  };
};

export function getSubjectDisplayName(subject?: Pick<SubjectInfo, 'title'>) {
  return subject?.title || '';
}

export function getAllSubjectNames(subject?: Pick<SubjectInfo, 'title' | 'search'>) {
  if (!subject) return [];
  return [...new Set([subject.title, ...subject.search.include].filter(Boolean))];
}

export function getSubjectURL(subject: Pick<SubjectInfo, 'id'>) {
  return `/subject/${subject.id}`;
}
