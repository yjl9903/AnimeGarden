export function toShanghai(date: Date) {
  const offset = -480 - new Date().getTimezoneOffset();
  return new Date(date.getTime() + offset * 60 * 1000);
}
