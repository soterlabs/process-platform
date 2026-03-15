import { OAuth2Client } from "google-auth-library";
import * as jose from "jose";
import { getAddress, verifyMessage } from "viem";
import {
  getJwtSecretForSigning,
  JWT_AUDIENCE,
  JWT_ISSUER,
} from "@/lib/jwt";
import { verifyToken as verifyTokenJwt } from "@/lib/jwt";
import { storageService } from "@/services/storage";
import { authorizationService } from "./authorization";
import type { IAuthenticationService } from "./interface";

const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const JWT_EXPIRY = "7d";
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

function normalizeAddress(addr: string): string {
  return (addr ?? "").toLowerCase();
}

async function createChallenge(walletAddress: string): Promise<{ message: string }> {
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

async function verifyAndIssueToken(
  walletAddress: string,
  message: string,
  signature: string
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
    signature: signature as `0x${string}`,
  });
  if (!valid) {
    throw new Error("Signature does not match wallet address.");
  }

  const user = await storageService.getUserByEvmAddress(address);
  if (!user) {
    throw new Error("No user registered for this wallet address.");
  }

  const roles = await authorizationService.getUserRoles(user.id);
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

async function verifyGoogleIdTokenAndIssueToken(
  idToken: string
): Promise<{ token: string; userId: string }> {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error("Google Sign-In is not configured (NEXT_PUBLIC_GOOGLE_CLIENT_ID missing).");
  }
  const client = new OAuth2Client(GOOGLE_CLIENT_ID);
  const ticket = await client.verifyIdToken({
    idToken: idToken.trim(),
    audience: GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  const email = payload?.email?.trim();
  if (!email) {
    throw new Error("Invalid Google ID token: missing email.");
  }
  const user = await storageService.getUserByEmail(email);
  if (!user) {
    throw new Error("No user registered for this email address.");
  }

  const roles = await authorizationService.getUserRoles(user.id);
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

export const authenticationService: IAuthenticationService = {
  createChallenge,
  verifyAndIssueToken,
  verifyGoogleIdTokenAndIssueToken,
  verifyToken: verifyTokenJwt,
};
