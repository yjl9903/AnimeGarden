import { format } from 'date-fns';

export function formatDateTime(date: Date, template = 'yyyy-MM-dd HH:mm') {
  return format(date, template);
}
