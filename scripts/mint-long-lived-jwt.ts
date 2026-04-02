/**
 * One-off: mint a long-lived JWT with the same shape as login tokens.
 *
 * Usage (from repo root, with JWT_SECRET in .env.local):
 *   npx tsx scripts/mint-long-lived-jwt.ts <userId> [--expires "10 years"] [--roles role1,role2]
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
  roles: string[];
} {
  const rest = argv.slice(2);
  if (rest.length === 0 || rest[0]?.startsWith("--")) {
    console.error(
      "Usage: npx tsx scripts/mint-long-lived-jwt.ts <userId> [--expires <duration>] [--roles a,b]"
    );
    process.exit(1);
  }
  let userId = rest[0]!;
  let expires = "10 years";
  let roles: string[] = [];
  for (let i = 1; i < rest.length; i++) {
    const a = rest[i];
    if (a === "--expires" && rest[i + 1]) {
      expires = rest[++i]!;
    } else if (a === "--roles" && rest[i + 1]) {
      roles = rest[++i]!
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean);
    }
  }
  return { userId, expires, roles };
}

async function main(): Promise<void> {
  const { userId, expires, roles } = parseArgs(process.argv);
  const secret = getJwtSecretForSigning();
  const token = await new jose.SignJWT({ userId, roles })
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
