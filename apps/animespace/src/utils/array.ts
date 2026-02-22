export function splitArray<T>(
  array: T[],
  filter: (item: T, index: number, array: T[]) => boolean
): [T[], T[]] {
  const selected: T[] = [];
  const rest: T[] = [];
  for (let i = 0; i < array.length; i++) {
    if (filter(array[i], i, array)) {
      selected.push(array[i]);
    } else {
      rest.push(array[i]);
    }
  }
  return [selected, rest];
}
