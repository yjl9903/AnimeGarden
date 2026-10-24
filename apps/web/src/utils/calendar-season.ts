export const CalendarSeasonMonths = [1, 4, 7, 10];

const CalendarSeasonMap = {
  1: { emoji: '❄️', name: '1 月新番', label: '1 月' },
  4: { emoji: '🌸', name: '4 月新番', label: '4 月' },
  7: { emoji: '☀️', name: '7 月新番', label: '7 月' },
  10: { emoji: '🍁', name: '10 月新番', label: '10 月' }
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
    title: `${year} ${meta.name}`
  };
}
