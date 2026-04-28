/**
 * Auth0 API permission names (RBAC). Must match Dashboard → APIs → Permissions.
 * Comparisons are case-insensitive.
 */
export const PERMISSIONS = {
  TEMPLATES_READ: "templates:read",
  TEMPLATES_WRITE: "templates:write",
  PROCESSES_READ: "processes:read",
  PROCESSES_WRITE: "processes:write",
  PROCESSES_DELETE: "processes:delete",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const PERMISSIONS_LIST: Permission[] = Object.values(PERMISSIONS);

/** Case-insensitive: does the permission list include this permission? */
export function hasPermission(
  permissions: string[] | null | undefined,
  permission: string
): boolean {
  if (!permissions?.length || !permission) return false;
  const lower = permission.toLowerCase();
  return permissions.some((p) => p.toLowerCase() === lower);
}
