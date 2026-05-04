import type { BasicSubject } from 'bgmd';

const separators = ['/', '-', '\\'] as const;

type Separator = (typeof separators)[number];

type MatchedTitle = {
  title: string;
  separators: Separator[];
};

type MatchedSubject = Pick<BasicSubject, 'id' | 'title' | 'platform' | 'onair_date'> & {
  titles: MatchedTitle[];
};

const bgmd = await import('bgmd', { with: { type: 'json' } });

const matches = bgmd.default.subjects
  .map(findMatchedSubject)
  .filter((subject): subject is MatchedSubject => subject !== undefined);

for (const subject of matches) {
  const meta = [subject.platform, subject.onair_date].filter(Boolean).join(', ');
  console.log(`#${subject.id} ${subject.title}${meta ? ` (${meta})` : ''}`);

  for (const { title, separators } of subject.titles) {
    console.log(`  [${separators.join(' ')}] ${title}`);
  }
}

console.error(
  `Found ${matches.length} subjects, ${matches.reduce((sum, subject) => sum + subject.titles.length, 0)} titles.`
);

function findMatchedSubject(subject: BasicSubject): MatchedSubject | undefined {
  const titles = [subject.title, ...subject.search.include];
  const matchedTitles = [...new Set(titles)].map(findMatchedTitle).filter((title) => title !== undefined);

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
  const matchedSeparators = separators.filter((separator) => title.includes(` ${separator} `));

  if (matchedSeparators.length === 0) {
    return undefined;
  }

  return {
    title,
    separators: matchedSeparators
  };
}
