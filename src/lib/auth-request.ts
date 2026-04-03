import type { NextRequest } from "next/server";
import {
  authenticationService,
  type AuthPrincipal,
} from "@/services/auth";

export type { AuthPrincipal };

/**
 * Verify the Bearer session JWT (Node API routes only). JWT verification must not run in
 * Edge middleware — env and crypto differ from Route Handlers on platforms like Railway.
 */
export async function getPrincipalFromRequest(
  request: NextRequest
): Promise<AuthPrincipal | null> {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7).trim();
  if (!token) return null;
  return authenticationService.verifySessionToken(token);
}
