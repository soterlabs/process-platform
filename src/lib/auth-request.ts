import type { NextRequest } from "next/server";

/**
 * Read user id set by middleware after JWT verification.
 * Use in API routes that need the current user. Middleware guarantees this is set for protected routes.
 */
export function getUserIdFromRequest(request: NextRequest): string | null {
  return request.headers.get("x-user-id");
}
