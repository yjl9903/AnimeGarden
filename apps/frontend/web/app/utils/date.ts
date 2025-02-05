import { formatInTimeZone } from 'date-fns-tz';

export function formatChinaTime(date: Date, formatStr = 'yyyy-MM-dd HH:mm') {
  try {
    return formatInTimeZone(date, 'Asia/Shanghai', formatStr);
  } catch (error) {
    console.log(error);
    return '';
  }
}
