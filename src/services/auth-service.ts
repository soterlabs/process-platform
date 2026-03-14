import * as jose from "jose";
import { getAddress, verifyMessage } from "viem";
import {
  getJwtSecretForSigning,
  JWT_AUDIENCE,
  JWT_ISSUER,
} from "@/lib/jwt";
import { getUserRoles } from "@/services/authorization-service";
import { storageService } from "@/services/storage";

const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const JWT_EXPIRY = "7d";

function normalizeAddress(addr: string): string {
  return (addr ?? "").toLowerCase();
}

/**
 * Generate a challenge message for the wallet to sign (e.g. for MetaMask personal_sign).
 * The challenge is stored so verifyAndIssueToken can look it up. The client should
 * pass walletAddress and then sign the returned message.
 */
export async function createChallenge(walletAddress: string): Promise<{ message: string }> {
  const normalized = normalizeAddress(walletAddress);
  if (!normalized.startsWith("0x") || normalized.length < 10) {
    throw new Error("Invalid wallet address");
  }
  const nonce = crypto.randomUUID();
  const message = `Sign in to Process Platform\n\nNonce: ${nonce}`;
  await storageService.setAuthChallenge(normalized, {
    message,
    expiresAt: Date.now() + CHALLENGE_TTL_MS,
  });
  return { message };
}

/**
 * Verify the signature against the challenge and issue a JWT containing the user id.
 * The user must exist in storage with matching evmWalletAddress.
 */
export async function verifyAndIssueToken(
  walletAddress: string,
  message: string,
  signature: `0x${string}`
): Promise<{ token: string; userId: string }> {
  let address: `0x${string}`;
  try {
    address = getAddress(walletAddress);
  } catch {
    throw new Error("Invalid wallet address.");
  }
  const normalized = normalizeAddress(address);
  const stored = await storageService.getAuthChallenge(normalized);
  if (!stored) {
    throw new Error("No challenge found for this address. Request a new challenge.");
  }
  if (Date.now() > stored.expiresAt) {
    await storageService.deleteAuthChallenge(normalized);
    throw new Error("Challenge expired. Request a new challenge.");
  }
  if (stored.message !== message) {
    throw new Error("Message does not match challenge.");
  }
  await storageService.deleteAuthChallenge(normalized);

  const valid = await verifyMessage({
    address,
    message,
    signature,
  });
  if (!valid) {
    throw new Error("Signature does not match wallet address.");
  }

  const user = await storageService.getUserByEvmAddress(address);
  if (!user) {
    throw new Error("No user registered for this wallet address.");
  }

  const roles = await getUserRoles(user.id);

  const secret = getJwtSecretForSigning();
  const token = await new jose.SignJWT({ userId: user.id, roles })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(JWT_EXPIRY)
    .setIssuedAt()
    .sign(secret);

  return { token, userId: user.id };
}

export { verifyToken } from "@/lib/jwt";
