import type { BasicSubject } from 'bgmd';

import { getCalendar } from '~/query/subject.server';
import { ResponseCacheControl } from '~/utils/response';

import { AnimeHead } from './head.server';
import {
  escapeMarkdown,
  frontmatter,
  heading,
  listItem,
  type MarkdownResult
} from './shared.server';

const Weekdays = ['一', '二', '三', '四', '五', '六', '日'];

export async function renderAnimeMarkdown(): Promise<MarkdownResult> {
  const calendar = await getCalendar();
  // Markdown keeps a stable Monday-Sunday order instead of the UI's current-day rotation.
  const body =
    frontmatter(AnimeHead) +
    heading(1, '动画周历') +
    calendar
      .map((subjects, index) => {
        const bangumis = sortSubjects(subjects);

        return (
          heading(2, `星期${Weekdays[index] ?? index + 1}`) +
          (bangumis.length
            ? bangumis
                .map((item) =>
                  listItem(`${escapeMarkdown(item.title || '未命名动画')} - /subject/${item.id}`)
                )
                .join('') + '\n'
            : '暂无动画。\n\n')
        );
      })
      .join('');

  return { body, cacheControl: ResponseCacheControl.List };
}

function sortSubjects(subjects: BasicSubject[]) {
  return subjects
    .filter((subject) => !!subject.poster)
    .filter((subject) => !isChina(subject))
    .sort((lhs, rhs) => {
      const lang = Number(isChina(lhs)) - Number(isChina(rhs));
      if (lang !== 0) return lang;
      return new Date(rhs.onair_date!).getTime() - new Date(lhs.onair_date!).getTime();
    });
}

function isChina(subject: BasicSubject) {
  const names = ['国创', '国产', '国产动画', '国漫', '中国'];
  return subject.tags.some((tag) => names.includes(tag));
}
