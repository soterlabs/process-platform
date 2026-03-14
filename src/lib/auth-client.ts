/**
 * Client-side auth: token in localStorage, helpers for fetch and redirect.
 * Roles are read from the JWT payload (set at login); no verification on client.
 */

const TOKEN_KEY = "process-platform-token";

export type TokenPayload = { userId: string; roles: string[] };

/**
 * Decode JWT payload without verifying (client has no secret). Returns null if invalid.
 * Used to read userId and roles for UI. Backend always verifies the token.
 */
export function decodeTokenPayload(token: string): TokenPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64url = parts[1];
    const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = atob(padded);
    const data = JSON.parse(json) as { userId?: unknown; roles?: unknown };
    const userId = data.userId;
    if (typeof userId !== "string" || !userId) return null;
    const roles = Array.isArray(data.roles)
      ? (data.roles as string[]).filter((r) => typeof r === "string")
      : [];
    return { userId, roles };
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
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
