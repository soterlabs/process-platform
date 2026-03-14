import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/auth-request";
import { ROLES } from "@/lib/roles";
import { userHasRole } from "@/services/authorization-service";

/**
 * Use in API routes: if the current user does not have the admin role, returns a 401/403 response; otherwise returns null.
 * Example: const err = await requireAdmin(request); if (err) return err;
 */
export async function requireAdmin(
  request: NextRequest,
  options?: { message?: string }
): Promise<NextResponse | null> {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const allowed = await userHasRole(userId, ROLES.ADMIN);
  if (!allowed) {
    return NextResponse.json(
      { error: options?.message ?? "Admin role required" },
      { status: 403 }
    );
  }
  return null;
}
