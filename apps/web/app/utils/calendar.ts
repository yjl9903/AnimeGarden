import type { BasicSubject } from 'bgmd';

import { calendar as rawCalendar } from 'bgmd/calendar';

export const getCalendar = () => {
  // Before 6:00
  const Weekday = (new Date(new Date().getTime() - 6 * 60 * 60 * 1000).getDay() + 6) % 7;

  return rawCalendar.map((_, idx) => {
    const index = (idx + Weekday) % 7;

    const isChina = (bgm: BasicSubject) => {
      const cn = ['国创', '国产', '国产动画', '国漫', '中国'];
      return bgm.tags.some((t) => cn.includes(t)) ? 1 : 0;
    };

    return {
      index: index + 1,
      text: ['一', '二', '三', '四', '五', '六', '日'][index],
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
