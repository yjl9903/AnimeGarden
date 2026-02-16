export function isDef<T extends {}>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null;
}
