import type { CalendarSubject, DatabaseSubject } from 'bgmx/client';

/** Display and search data shared by Web, RSS and Telegram, independent of active status. */
export interface SubjectMetadata {
  id: number;
  title: string;
  display_title: string;
  platform: string;
  onair_date?: string | null;
  poster: string;
  summary: string;
  alias: DatabaseSubject['alias'];
  tags: string[];
  search: DatabaseSubject['search'];
}

/** Canonical poster endpoint; availability still depends on the mirror and Telegram. */
export function getSubjectPosterURL(subjectId: number) {
  return `https://bgm.animes.garden/bangumi/subject/${subjectId}/poster.jpeg?quality=large`;
}

/** Normalize live bgmx records without changing resource search semantics. */
export function transformBgmSubject(subject: DatabaseSubject | CalendarSubject): SubjectMetadata {
  return {
    id: subject.id,
    title: subject.title,
    display_title: subject.alias.zh?.[0] || subject.title,
    platform: subject.bangumi.platform,
    onair_date: subject.onair_date || subject.bangumi.date,
    poster: subject.poster || subject.bangumi.images.large ? getSubjectPosterURL(subject.id) : '',
    summary: subject.bangumi.summary,
    alias: subject.alias,
    tags: [...new Set([...(subject.bangumi.meta_tags ?? []), ...(subject.bangumi.tags ?? [])])],
    search: subject.search
  };
}
