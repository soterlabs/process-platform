import { decodeJwt } from "jose";
import type { NextRequest } from "next/server";
import {
  authenticationService,
  type AuthPrincipal,
} from "@/services/auth";

export type { AuthPrincipal };

/**
 * Read principal from the Bearer JWT (middleware already validated via verifySessionToken).
 */
export function getPrincipalFromRequest(request: NextRequest): AuthPrincipal | null {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7).trim();
  if (!token) return null;
  try {
    const payload = decodeJwt(token);
    return authenticationService.principalFromJwtPayload(payload);
  } catch {
    return null;
  }
}
