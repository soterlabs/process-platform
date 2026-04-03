import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getPrincipalFromRequest } from "@/lib/auth-request";
import { authorizationService } from "@/services/auth";

/**
 * API routes: if the current user lacks the permission, returns 401/403; otherwise null.
 */
export function requirePermission(
  request: NextRequest,
  permission: string,
  options?: { message?: string }
): NextResponse | null {
  const principal = getPrincipalFromRequest(request);
  if (!principal) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const allowed = authorizationService.userHasPermission(principal.permissions, permission);
  if (!allowed) {
    return NextResponse.json(
      { error: options?.message ?? `${permission} permission required` },
      { status: 403 }
    );
  }
  return null;
}
