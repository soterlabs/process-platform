import { createChallenge as createChallengeInAuth, verifyAndIssueToken } from "@/services/auth-service";

export type ChallengeRequestBody = {
  walletAddress?: unknown;
};

export type VerifyRequestBody = {
  walletAddress?: unknown;
  message?: unknown;
  signature?: unknown;
};

/**
 * Validate challenge request body and create a sign-in challenge. Throws on invalid input.
 */
export async function createChallenge(
  body: unknown
): Promise<{ message: string }> {
  const b = body as ChallengeRequestBody;
  const walletAddress =
    typeof b.walletAddress === "string" ? b.walletAddress.trim() : "";
  if (!walletAddress) {
    throw new Error("walletAddress is required");
  }
  return createChallengeInAuth(walletAddress);
}

/**
 * Validate verify request body and issue a JWT. Throws on invalid input or verification failure.
 */
export async function verify(
  body: unknown
): Promise<{ token: string; userId: string }> {
  const b = body as VerifyRequestBody;
  const walletAddress =
    typeof b.walletAddress === "string" ? b.walletAddress.trim() : "";
  const message = typeof b.message === "string" ? b.message.trim() : "";
  const signatureRaw =
    typeof b.signature === "string" ? b.signature.trim() : "";

  if (!walletAddress || !message || !signatureRaw) {
    throw new Error("walletAddress, message, and signature are required");
  }

  const signature = signatureRaw.startsWith("0x")
    ? (signatureRaw as `0x${string}`)
    : (`0x${signatureRaw}` as `0x${string}`);

  return verifyAndIssueToken(walletAddress, message, signature);
}
