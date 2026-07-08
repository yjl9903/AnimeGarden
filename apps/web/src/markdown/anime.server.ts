import { getCalendar, getCalendars, getLatestCalendar } from '~/query/subject.server';
import { getCalendarSeason } from '~/utils/calendar-season';
import { ResponseCacheControl } from '~/utils/response';
import { getSubjectDisplayName, type WebBgmSubject } from '~/utils/subject';

import { AnimeHead, calendarHead } from './head.server';
import {
  escapeMarkdown,
  errorMarkdown,
  frontmatter,
  heading,
  listItem,
  type MarkdownResult
} from './shared.server';

const Weekdays = ['一', '二', '三', '四', '五', '六', '日'];

export async function renderAnimeMarkdown(season?: string): Promise<MarkdownResult> {
  if (season && !(await getCalendars()).some((calendar) => calendar.season === season)) {
    return errorMarkdown('动画周历不存在', '请求的动画周历不存在或尚未发布。', 404);
  }

  const resolved = season
    ? { season, calendar: await getCalendar(season) }
    : await getLatestCalendar();
  const calendarSeason = getCalendarSeason(resolved.season);
  const head = season ? calendarHead(resolved.season) : AnimeHead;
  const title = season ? `${calendarSeason.title}动画周历` : '动画周历';

  // Markdown keeps a stable Monday-Sunday order instead of the UI's current-day rotation.
  const body =
    frontmatter(head) +
    heading(1, title) +
    resolved.calendar
      .map((subjects, index) => {
        const bangumis = sortSubjects(subjects);

        return (
          heading(2, `星期${Weekdays[index] ?? index + 1}`) +
          (bangumis.length
            ? bangumis
                .map((item) =>
                  listItem(
                    `${escapeMarkdown(getSubjectDisplayName(item) || '未命名动画')} - /subject/${item.id}`
                  )
                )
                .join('') + '\n'
            : '暂无动画。\n\n')
        );
      })
      .join('');

  return { body, cacheControl: ResponseCacheControl.List };
}

function sortSubjects(subjects: WebBgmSubject[]) {
  return subjects
    .filter((subject) => !!subject.poster)
    .filter((subject) => !isChina(subject))
    .sort((lhs, rhs) => {
      const lang = Number(isChina(lhs)) - Number(isChina(rhs));
      if (lang !== 0) return lang;
      return new Date(rhs.onair_date!).getTime() - new Date(lhs.onair_date!).getTime();
    });
}

function isChina(subject: WebBgmSubject) {
  const names = ['国创', '国产', '国产动画', '国漫', '中国'];
  return subject.tags.some((tag) => names.includes(tag));
}
