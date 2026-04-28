/**
 * Absolute URL to the process detail page (`/process/[id]`).
 *
 * - Server / jobs: `APP_BASE_URL` or `NEXT_PUBLIC_APP_BASE_URL` (trimmed, no trailing slash).
 * - Browser: same env vars if inlined; otherwise `window.location.origin`.
 */
export function absoluteProcessViewUrl(processId: string | undefined | null): string {
  const id = (processId ?? "").trim();
  if (!id) return "";

  const fromEnv =
    typeof process !== "undefined" && process.env
      ? process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_BASE_URL
      : "";
  const baseFromEnv = String(fromEnv ?? "").replace(/\/$/, "");

  if (baseFromEnv) {
    return `${baseFromEnv}/process/${encodeURIComponent(id)}`;
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/process/${encodeURIComponent(id)}`;
  }

  return "";
}
