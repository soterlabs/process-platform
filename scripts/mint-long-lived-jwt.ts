/**
 * One-off: mint a long-lived HS256 app token (automation / local testing only).
 * Browser login uses Auth0 JWTs; this script does not affect normal sign-in.
 *
 * Usage (from repo root, with JWT_SECRET in .env.local):
 *   npx tsx scripts/mint-long-lived-jwt.ts <userId> [--expires "10 years"] [--permissions a,b]
 */
import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as jose from "jose";
import {
  getJwtSecretForSigning,
  JWT_AUDIENCE,
  JWT_ISSUER,
} from "../src/lib/jwt";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env.local") });
config({ path: resolve(__dirname, "../.env") });

function parseArgs(argv: string[]): {
  userId: string;
  expires: string;
  permissions: string[];
} {
  const rest = argv.slice(2);
  if (rest.length === 0 || rest[0]?.startsWith("--")) {
    console.error(
      "Usage: npx tsx scripts/mint-long-lived-jwt.ts <userId> [--expires <duration>] [--permissions a,b]"
    );
    process.exit(1);
  }
  let userId = rest[0]!;
  let expires = "10 years";
  let permissions: string[] = [];
  for (let i = 1; i < rest.length; i++) {
    const a = rest[i];
    if (a === "--expires" && rest[i + 1]) {
      expires = rest[++i]!;
    } else if ((a === "--permissions" || a === "--roles") && rest[i + 1]) {
      permissions = rest[++i]!
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean);
    }
  }
  return { userId, expires, permissions };
}

async function main(): Promise<void> {
  const { userId, expires, permissions } = parseArgs(process.argv);
  const secret = getJwtSecretForSigning();
  const token = await new jose.SignJWT({ userId, permissions })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(expires)
    .setIssuedAt()
    .sign(secret);

  console.log(token);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
