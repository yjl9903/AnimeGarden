import { formatInTimeZone } from 'date-fns-tz';

export function formatChinaTime(date: Date) {
  return formatInTimeZone(date, 'Asia/Shanghai', 'yyyy-MM-dd HH:mm');
}
