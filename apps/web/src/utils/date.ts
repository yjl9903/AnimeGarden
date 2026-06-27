import { formatInTimeZone } from 'date-fns-tz';

export function formatChinaTime(date: Date, formatStr = 'yyyy-MM-dd HH:mm') {
  try {
    return formatInTimeZone(date, 'Asia/Shanghai', formatStr);
  } catch (error) {
    console.log(error);
    return '';
  }
}

/**
 * 获取日期的星期几
 * @param dateString 形如 "2025-07-17" 的日期字符串
 * @returns 星期几的中文表示，如 "星期四"
 */
export function getWeekday(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return '';
    }

    const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    return weekdays[date.getDay()];
  } catch (error) {
    console.log(error);
    return '';
  }
}
