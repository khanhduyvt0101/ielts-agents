export function normalizeCallback(callback?: string | null): string {
  if (!callback) return "/";
  try {
    const { pathname, search } = new URL(callback, origin);
    return `${pathname}${search}`;
  } catch {
    return "/";
  }
}
