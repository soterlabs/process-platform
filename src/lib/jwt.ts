/**
 * Edge-safe JWT verification (jose only, no Node APIs).
 * Used by middleware and auth-request.
 */
import * as jose from "jose";

const JWT_ISSUER = "process-platform";
const JWT_AUDIENCE = "process-platform";

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("JWT_SECRET must be set (e.g. in .env.local)");
  }
  return new TextEncoder().encode(secret);
}

export async function verifyToken(
  token: string
): Promise<{ userId: string; roles: string[] } | null> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jose.jwtVerify(token, secret, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    const userId = payload.userId;
    if (typeof userId !== "string" || !userId) return null;
    const roles = Array.isArray(payload.roles)
      ? (payload.roles as string[]).filter((r) => typeof r === "string")
      : [];
    return { userId, roles };
  } catch {
    return null;
  }
}

export function getJwtSecretForSigning(): Uint8Array {
  return getJwtSecret();
}

export { JWT_ISSUER, JWT_AUDIENCE };
