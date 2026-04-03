import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getPrincipalFromRequest, type AuthPrincipal } from "@/lib/auth-request";
import { authorizationService } from "@/services/auth";

/**
 * API routes: 401/403 response, or the verified principal (single JWT verification per call).
 */
export async function requirePermission(
  request: NextRequest,
  permission: string,
  options?: { message?: string }
): Promise<NextResponse | AuthPrincipal> {
  const principal = await getPrincipalFromRequest(request);
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
  return principal;
}
