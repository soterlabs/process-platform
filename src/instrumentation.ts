/**
 * Runs once when the Node.js server starts (e.g. `next start` on Railway).
 * Logs whether expected env vars are non-empty — never logs secret values.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") {
    return;
  }

  const keys = [
    "GEMINI_API_KEY",
    "APP_BASE_URL",
    "NEXT_PUBLIC_APP_BASE_URL",
    "SLACK_BOT_TOKEN",
    "AUTH0_AUDIENCE",
    "AUTH0_DOMAIN",
    "AUTH0_CLIENT_ID",
    "AUTH0_CLIENT_SECRET",
    "AUTH0_SECRET",
  ] as const;

  const lines = keys.map((k) => {
    const v = process.env[k];
    const ok = typeof v === "string" && v.trim().length > 0;
    return `  ${k}: ${ok ? "set" : "MISSING"}`;
  });

  console.log(`[process-platform] Env check (presence only, not values)\n${lines.join("\n")}`);
}
