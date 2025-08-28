/**
 * Utility to get a display name for a user, with fallback logic.
 * @param user User object with first_name, last_name, id
 * @param fallback Fallback string if no name is available
 */
export function getDisplayName(
  user: { first_name?: string | null; last_name?: string | null; id?: string } | null | undefined,
  fallback: string = 'Unknown User'
): string {
  if (!user) return fallback;
  const fn = user.first_name?.trim() || '';
  const ln = user.last_name?.trim() || '';
  if (fn && ln) return `${fn} ${ln}`;
  if (fn) return fn;
  if (ln) return ln;
  if (user.id) return `${fallback} (${user.id})`;
  return fallback;
}
