/**
 * Client-side auth: token in localStorage, helpers for fetch and redirect.
 * Permission strings come from the JWT `permissions` claim; no verification on client.
 */

/** Must match the key used in `/api/auth/callback` handoff HTML. */
export const AUTH_TOKEN_STORAGE_KEY = "process-platform-token";

export type TokenPayload = { userId: string; permissions: string[]; email?: string };

/**
 * Decode JWT payload without verifying (client cannot verify RS256). Returns null if invalid.
 * Auth0 tokens use `sub`; legacy minted tokens use `userId`. Backend verifies Bearer tokens.
 */
export function decodeTokenPayload(token: string): TokenPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64url = parts[1];
    const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = atob(padded);
    const data = JSON.parse(json) as Record<string, unknown>;
    const sub = data.sub;
    const legacyId = data.userId;
    const userId =
      typeof sub === "string" && sub
        ? sub
        : typeof legacyId === "string" && legacyId
          ? legacyId
          : null;
    if (!userId) return null;
    let permissions: string[] = [];
    if (Array.isArray(data.permissions)) {
      permissions = data.permissions.filter((p): p is string => typeof p === "string");
    } else if (Array.isArray(data.roles)) {
      permissions = data.roles.filter((p): p is string => typeof p === "string");
    }
    const emailClaim =
      process.env.NEXT_PUBLIC_AUTH0_EMAIL_CLAIM?.trim() || process.env.AUTH0_EMAIL_CLAIM?.trim();
    const fromClaim =
      emailClaim && typeof data[emailClaim] === "string"
        ? (data[emailClaim] as string).trim()
        : "";
    const emailRaw = fromClaim || data.email;
    const email =
      typeof emailRaw === "string" && emailRaw.trim() ? emailRaw.trim() : undefined;
    return email ? { userId, permissions, email } : { userId, permissions };
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
}

export function removeToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
}

export function authHeaders(): Record<string, string> {
  const token = getToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    removeToken();
    if (typeof window !== "undefined") {
      const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?returnUrl=${returnUrl}`;
    }
  }
  return res;
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
