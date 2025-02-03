import type { FullBangumi } from 'bgmd/types';

import { calendar as rawCalendar } from 'bgmd/calendar';

import { stringifyURLSearch } from '@animegarden/client';

// Before 6:00
export const Weekday = (new Date(new Date().getTime() - 6 * 60 * 60 * 1000).getDay() + 6) % 7;

export const calendar = rawCalendar.map((_, idx) => {
  const index = (idx + Weekday) % 7;

  const isChina = (bgm: FullBangumi) => {
    const cn = ['国创', '国产', '国产动画', '国漫', '中国'];
    return bgm.bangumi?.tags.some((t) => cn.includes(t)) ? 1 : 0;
  };

  return {
    index: index + 1,
    text: ['一', '二', '三', '四', '五', '六', '日'][index],
    bangumis: rawCalendar[index]
      .filter((b) => !!getPosterImage(b))
      .filter((b) => !isChina(b))
      .sort((lhs, rhs) => {
        const lang = isChina(lhs) - isChina(rhs);
        if (lang !== 0) return lang;
        return new Date(rhs.air_date).getTime() - new Date(lhs.air_date).getTime();
      })
  };
});

export function getPosterImage(bgm: FullBangumi) {
  if (bgm.tmdb?.poster_path) {
    return `https://www.themoviedb.org/t/p/w300_and_h450_bestv2${bgm.tmdb.poster_path}`;
  } else if (bgm.bangumi?.images) {
    return bgm.bangumi.images.large;
  }
}

export function getDisplayName(bgm: FullBangumi) {
  if (bgm.bangumi) {
    return bgm.bangumi.name_cn || bgm.name;
  }
  return bgm.name;
}

export function getSearchURL(bgm: FullBangumi) {
  const search = stringifyURLSearch({
    after: new Date(new Date(bgm.air_date).getTime() - 7 * 24 * 60 * 60 * 1000)
  });
  return `/subject/${bgm.id}?${search.toString()}`;
}
