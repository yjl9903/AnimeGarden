export const CalendarSeasonMonths = [1, 4, 7, 10];

const CalendarSeasonMap = {
  1: { emoji: '❄️', name: '冬季新番', label: '冬季' },
  4: { emoji: '🌸', name: '春季新番', label: '春季' },
  7: { emoji: '☀️', name: '夏季新番', label: '夏季' },
  10: { emoji: '🍁', name: '秋季新番', label: '秋季' }
} as const;

export function getCalendarSeason(season?: string) {
  if (!season) {
    return {
      season: '',
      year: '',
      month: 0,
      emoji: '',
      name: '新番',
      label: '选择季度',
      title: '新番'
    };
  }

  const [year, monthText] = season.split('-');
  const month = Number(monthText);
  const meta = CalendarSeasonMap[month as keyof typeof CalendarSeasonMap] ?? {
    emoji: '',
    name: `${month} 月新番`,
    label: `${month} 月`
  };

  return {
    season,
    year,
    month,
    ...meta,
    title: `${year} · ${meta.name}`
  };
}
