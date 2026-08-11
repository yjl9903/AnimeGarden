export type SubjectInfo = {
  id: number;
  title: string;
  display_title?: string | null;
  search: {
    include: string[];
  };
};

export type WebBgmSubject = SubjectInfo & {
  platform: string;
  onair_date?: string | null;
  poster: string;
  summary: string;
  alias: Partial<Record<'ja' | 'zh' | 'en', string[]>>;
  tags: string[];
};

/** Returns the canonical large poster URL served by the Anime Garden Bangumi mirror. */
export function getSubjectPosterURL(subjectId: number) {
  return `https://bgm.animes.garden/bangumi/subject/${subjectId}/poster.jpeg?quality=large`;
}

export function getSubjectDisplayName(subject?: Pick<SubjectInfo, 'title' | 'display_title'>) {
  return subject?.display_title || subject?.title || '';
}

export function getAllSubjectNames(
  subject?: Pick<SubjectInfo, 'title' | 'display_title' | 'search'>
) {
  if (!subject) return [];
  return [
    ...new Set([subject.display_title, subject.title, ...subject.search.include].filter(Boolean))
  ];
}

export function getSubjectURL(subject: Pick<SubjectInfo, 'id'>) {
  return `/subject/${subject.id}`;
}

/** Builds typed link props for subject detail pages. */
export function getSubjectRouteLink(subject: Pick<SubjectInfo, 'id'>) {
  return {
    to: '/subject/$subject' as const,
    params: { subject: String(subject.id) }
  };
}
