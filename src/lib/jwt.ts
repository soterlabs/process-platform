export const JWT_ISSUER = "process-platform";
export const JWT_AUDIENCE = "process-platform";

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("JWT_SECRET must be set (e.g. in .env.local)");
  }
  return new TextEncoder().encode(secret);
}

export function getJwtSecretForSigning(): Uint8Array {
  return getJwtSecret();
}
