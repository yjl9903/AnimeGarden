import { formatInTimeZone } from 'date-fns-tz';

import type { WebBgmSubject } from './subject';

/** Rotates the seven weekdays and appends the upstream WEB bucket at a fixed position. */
export const getCalendar = (rawCalendar: WebBgmSubject[][], now = new Date()) => {
  // Before 6:00
  const Weekday =
    Number(formatInTimeZone(new Date(now.getTime() - 6 * 60 * 60 * 1000), 'Asia/Shanghai', 'i')) -
    1;

  return rawCalendar.map((_, idx) => {
    const index = idx < 7 ? (idx + Weekday) % 7 : idx;

    const isChina = (bgm: WebBgmSubject) => {
      const cn = ['国创', '国产', '国产动画', '国漫', '中国'];
      return bgm.tags.some((t) => cn.includes(t)) ? 1 : 0;
    };

    return {
      index: index + 1,
      text: index === 7 ? 'WEB' : ['一', '二', '三', '四', '五', '六', '日'][index],
      label: index === 7 ? 'WEB' : `星期${['一', '二', '三', '四', '五', '六', '日'][index]}`,
      bangumis: rawCalendar[index]
        .filter((b) => !!b.poster)
        .filter((b) => !isChina(b))
        .sort((lhs, rhs) => {
          const lang = isChina(lhs) - isChina(rhs);
          if (lang !== 0) return lang;
          return new Date(rhs.onair_date!).getTime() - new Date(lhs.onair_date!).getTime();
        })
    };
  });
};
