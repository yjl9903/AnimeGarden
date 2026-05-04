import type { BasicSubject } from 'bgmd';

import { Wrappers } from '../src/tokenizer/index.js';

type MatchedWrapper = {
  left: string;
  right: string;
  texts: string[];
};

type MatchedTitle = {
  title: string;
  wrappers: MatchedWrapper[];
};

type MatchedSubject = Pick<BasicSubject, 'id' | 'title' | 'platform' | 'onair_date'> & {
  titles: MatchedTitle[];
};

const wrapperPatterns = [...Wrappers.entries()].map(([left, right]) => ({
  left,
  right,
  re: new RegExp(`${escapeRegExp(left)}([^${escapeRegExp(right)}]+)${escapeRegExp(right)}`, 'g')
}));

const bgmd = await import('bgmd', { with: { type: 'json' } });

const matches = bgmd.default.subjects
  .map(findMatchedSubject)
  .filter((subject): subject is MatchedSubject => subject !== undefined);

for (const subject of matches) {
  const meta = [subject.platform, subject.onair_date].filter(Boolean).join(', ');
  console.log(`#${subject.id} ${subject.title}${meta ? ` (${meta})` : ''}`);

  for (const { title, wrappers } of subject.titles) {
    const labels = wrappers.map(({ left, right }) => `${left}${right}`).join(' ');
    console.log(`  [${labels}] ${title}`);

    for (const { left, right, texts } of wrappers) {
      console.log(`    ${left}${right}: ${texts.join(' | ')}`);
    }
  }
}

console.error(
  `Found ${matches.length} subjects, ${matches.reduce((sum, subject) => sum + subject.titles.length, 0)} titles.`
);

function findMatchedSubject(subject: BasicSubject): MatchedSubject | undefined {
  const titles = [subject.title, ...subject.search.include];
  const matchedTitles = [...new Set(titles)]
    .map(findMatchedTitle)
    .filter((title) => title !== undefined);

  if (matchedTitles.length === 0) {
    return undefined;
  }

  return {
    id: subject.id,
    title: subject.title,
    platform: subject.platform,
    onair_date: subject.onair_date,
    titles: matchedTitles
  };
}

function findMatchedTitle(title: string): MatchedTitle | undefined {
  const wrappers = wrapperPatterns
    .map(({ left, right, re }) => {
      re.lastIndex = 0;
      const texts = [...title.matchAll(re)]
        .map((match) => match[1].trim())
        .filter((text) => text && !isMetadataWrapperText(text));

      if (texts.length === 0) {
        return undefined;
      }

      return {
        left,
        right,
        texts
      };
    })
    .filter((wrapper) => wrapper !== undefined);

  if (wrappers.length === 0) {
    return undefined;
  }

  return {
    title,
    wrappers
  };
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isYearWrapperText(text: string) {
  const match = /^(\d{4})年?$/.exec(text);
  if (!match) return false;

  const year = Number(match[1]);
  return year >= 1949 && year <= 2099;
}

function isMetadataWrapperText(text: string) {
  if (isYearWrapperText(text)) {
    return true;
  }

  return (
    /^(?:Part\s*\d+|\d+|[a-z]?bd|oad|ova|tv|web|movie|剧场上映|剧场版|劇場版|映画)$/i.test(text) ||
    /^(?:第[一二三四五六七八九十\d]+期|第[一二三四五六七八九十\d]+季|第[一二三四五六七八九十\d]+作)$/i.test(text) ||
    /^(?:ova)?第[一二三四五六七八九十\d]+期$/i.test(text) ||
    /^(?:第[一二三四五六七八九十\d]+シリーズ|tv第[一二三四五六七八九十\d]+シリーズ)$/i.test(text) ||
    /^(?:[一二三四五六七八九十\d]+期)(?:・.*版)?$/i.test(text) ||
    /^(?:前|后|後|上|下|前篇|后篇|前編|後編|新篇|新編|黎明篇|黎明編|覚醒篇|覚醒編|氾濫篇|氾濫編)$/i.test(text) ||
    /^(?:第[\d、]+[話话]|\d+\s*-\s*\d+话|\d+(?:、\d+)+话)$/.test(text) ||
    /^(?:\d+(?:st|nd|rd|th)\s+season|season\d+)$/i.test(text) ||
    /^(?:dai\s+\d+\s+season|completely new anime|sequel|zoku-hen|provisional)$/i.test(text) ||
    /^(?:tv版|tv动画|tv动画新系列|tvアニメ新シリーズ|テレビアニメ版|リメイク版)$/i.test(text) ||
    /^(?:カラー版|彩色版|平成版|3d version)$/i.test(text) ||
    /^\d{4}(?:,\s*tv|\s+tv series|年(?:tvシリーズ|のテレビアニメ|の映画))$/i.test(text) ||
    /^(?:港|台|港\/台|港译|B站、爱奇艺、优酷|中国大陆华桦传媒|HOY TV)$/.test(text) ||
    /^华盟ep\.\d+$/i.test(text) ||
    /^KYOTO.*上映版$/i.test(text)
  );
}
