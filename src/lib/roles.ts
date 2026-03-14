/**
 * Platform role constants. Use these for permission checks in frontend and backend.
 * Comparisons are case-insensitive (e.g. "Admin" in a group matches ROLES.ADMIN).
 */
export const ROLES = {
  ADMIN: "admin",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/** All known role values (for validation, listing, etc.). */
export const ROLES_LIST: Role[] = Object.values(ROLES);

/** Case-insensitive check: does the roles array include this role? */
export function hasRole(roles: string[] | null | undefined, role: string): boolean {
  if (!roles?.length || !role) return false;
  const lower = role.toLowerCase();
  return roles.some((r) => r.toLowerCase() === lower);
}
