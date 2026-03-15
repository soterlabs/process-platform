import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/auth-request";
import type { Role } from "@/lib/roles";
import { authorizationService } from "@/services/auth";

/**
 * Use in API routes: if the current user does not have the given role, returns a 401/403 response; otherwise returns null.
 * Example: const err = await requireRole(request, ROLES.ADMIN); if (err) return err;
 */
export async function requireRole(
  request: NextRequest,
  role: Role,
  options?: { message?: string }
): Promise<NextResponse | null> {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const allowed = await authorizationService.userHasRole(userId, role);
  if (!allowed) {
    return NextResponse.json(
      { error: options?.message ?? `${role} role required` },
      { status: 403 }
    );
  }
  return null;
}
