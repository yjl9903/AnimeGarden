export function parseTimeString(timeStr: string): string {
  // 中国时区偏移（UTC+8）
  const CHINA_TZ_OFFSET = 8;

  // 获取当前UTC时间对应的中国时区日期
  const now = new Date(new Date().getTime() + 8 * 60 * 60 * 1000);

  if (timeStr.includes('今天')) {
    const timeMatch = timeStr.match(/今天\s+(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      const [, hours, minutes] = timeMatch;
      // 以当前UTC日期为基础，设置中国时区的小时和分钟，然后转为UTC时间
      const date = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        parseInt(hours) - CHINA_TZ_OFFSET,
        parseInt(minutes),
        0,
        0
      ));
      return date.toISOString();
    }
  }

  if (timeStr.includes('昨天')) {
    const timeMatch = timeStr.match(/昨天\s+(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      const [, hours, minutes] = timeMatch;
      // 以当前UTC日期为基础，减去一天，设置中国时区的小时和分钟，然后转为UTC时间
      const yesterday = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0, 0, 0, 0
      ));
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      yesterday.setUTCHours(parseInt(hours) - CHINA_TZ_OFFSET, parseInt(minutes), 0, 0);
      return yesterday.toISOString();
    }
  }

  // 处理具体日期格式 "2025/07/13 23:53"
  const fullDateMatch = timeStr.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})/);
  if (fullDateMatch) {
    const [, year, month, day, hours, minutes] = fullDateMatch;
    // 以中国时区的年月日时分，转为UTC时间
    const date = new Date(Date.UTC(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hours) - CHINA_TZ_OFFSET,
      parseInt(minutes),
      0,
      0
    ));
    return date.toISOString();
  }

  // 如果无法解析，返回当前时间
  return now.toISOString();
}