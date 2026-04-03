/**
 * Authentication: Auth0 OAuth2 code flow; session JWT is the **access token** for your Auth0 API
 * (audience = AUTH0_AUDIENCE) so RBAC `permissions` are present. Not the ID token.
 */
import * as jose from "jose";
import type { IAuthenticationService, AuthPrincipal } from "./interface";

const STATE_EXPIRY = "10m";

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN ?? "";
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE ?? "";
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID ?? "";
const AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET ?? "";
const AUTH0_SECRET = process.env.AUTH0_SECRET ?? "";

function normalizeAuth0Domain(domain: string): string {
  return domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function getAuth0Issuer(domain: string): string {
  return `https://${normalizeAuth0Domain(domain)}/`;
}

function normalizePermissionsFromPayload(payload: jose.JWTPayload): string[] {
  const perms = payload.permissions;
  if (Array.isArray(perms)) {
    return perms.filter((p): p is string => typeof p === "string");
  }
  const r = payload.roles;
  if (Array.isArray(r)) {
    return r.filter((x): x is string => typeof x === "string");
  }
  return [];
}

function emailFromPayload(payload: jose.JWTPayload): string | undefined {
  const claim =
    process.env.NEXT_PUBLIC_AUTH0_EMAIL_CLAIM?.trim() ||
    process.env.AUTH0_EMAIL_CLAIM?.trim();
  if (claim) {
    const v = payload[claim];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  const emailRaw = payload.email;
  return typeof emailRaw === "string" && emailRaw.trim() ? emailRaw.trim() : undefined;
}

function mapAuth0PayloadToPrincipal(payload: jose.JWTPayload): AuthPrincipal | null {
  const sub = payload.sub;
  if (typeof sub !== "string" || !sub.trim()) return null;
  const permissions = normalizePermissionsFromPayload(payload);
  const email = emailFromPayload(payload);
  return email ? { userId: sub, permissions, email } : { userId: sub, permissions };
}

async function verifyAuth0SessionToken(token: string): Promise<AuthPrincipal | null> {
  if (!AUTH0_DOMAIN || !AUTH0_AUDIENCE) {
    return null;
  }
  const domain = normalizeAuth0Domain(AUTH0_DOMAIN);
  const issuer = getAuth0Issuer(domain);
  const JWKS = jose.createRemoteJWKSet(
    new URL(`https://${domain}/.well-known/jwks.json`)
  );
  try {
    const { payload } = await jose.jwtVerify(token, JWKS, {
      issuer,
      audience: AUTH0_AUDIENCE,
    });
    return mapAuth0PayloadToPrincipal(payload);
  } catch {
    return null;
  }
}

function getStateSecret(): Uint8Array {
  if (!AUTH0_SECRET) {
    throw new Error("AUTH0_SECRET is not configured.");
  }
  return new TextEncoder().encode(AUTH0_SECRET);
}

/** Only same-origin paths; prevents open redirects after login. */
export function safeReturnPath(returnUrl: string): string {
  const u = returnUrl.trim();
  if (!u.startsWith("/") || u.startsWith("//")) return "/";
  return u;
}

async function signOAuthState(returnUrl: string): Promise<string> {
  const secret = getStateSecret();
  return new jose.SignJWT({ returnUrl: safeReturnPath(returnUrl) })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(STATE_EXPIRY)
    .setIssuedAt()
    .sign(secret);
}

async function verifyOAuthState(stateJwt: string): Promise<{ returnUrl: string }> {
  const secret = getStateSecret();
  const { payload } = await jose.jwtVerify(stateJwt, secret, {
    algorithms: ["HS256"],
  });
  const raw = payload.returnUrl;
  if (typeof raw !== "string") {
    throw new Error("Invalid OAuth state.");
  }
  return { returnUrl: safeReturnPath(raw) };
}

async function exchangeAuth0AuthorizationCode(
  code: string,
  redirectUri: string
): Promise<{ access_token: string }> {
  if (!AUTH0_DOMAIN || !AUTH0_CLIENT_ID || !AUTH0_CLIENT_SECRET || !AUTH0_AUDIENCE) {
    throw new Error(
      "Auth0 is not configured (AUTH0_DOMAIN, AUTH0_AUDIENCE, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET)."
    );
  }
  const domain = normalizeAuth0Domain(AUTH0_DOMAIN);
  /** Auth0 expects OAuth 2.0 form body; `audience` must match the authorize request. */
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: AUTH0_CLIENT_ID,
    client_secret: AUTH0_CLIENT_SECRET,
    code,
    redirect_uri: redirectUri,
    audience: AUTH0_AUDIENCE,
  });
  const res = await fetch(`https://${domain}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Auth0 token exchange failed: ${text}`);
  }
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token || typeof data.access_token !== "string") {
    throw new Error("Auth0 response missing access_token.");
  }
  return { access_token: data.access_token };
}

async function completeOAuthLogin(params: {
  code: string;
  state: string;
  redirectUri: string;
}): Promise<{ token: string; returnUrl: string }> {
  const { returnUrl } = await verifyOAuthState(params.state);
  const { access_token } = await exchangeAuth0AuthorizationCode(
    params.code,
    params.redirectUri
  );
  const verified = await verifyAuth0SessionToken(access_token);
  if (!verified) {
    throw new Error("Could not verify session token from identity provider.");
  }
  return { token: access_token, returnUrl };
}

async function buildOAuthLoginUrl(
  returnUrl: string,
  options?: { connection?: string }
): Promise<string> {
  if (!AUTH0_DOMAIN || !AUTH0_CLIENT_ID || !AUTH0_AUDIENCE) {
    throw new Error("Auth0 is not configured (AUTH0_DOMAIN, AUTH0_AUDIENCE, AUTH0_CLIENT_ID).");
  }
  const base = process.env.APP_BASE_URL?.replace(/\/$/, "");
  if (!base) {
    throw new Error("APP_BASE_URL is not configured.");
  }
  const redirectUri = `${base}/api/auth/callback`;
  const domain = normalizeAuth0Domain(AUTH0_DOMAIN);
  const signed = await signOAuthState(returnUrl);
  const params = new URLSearchParams({
    response_type: "code",
    client_id: AUTH0_CLIENT_ID,
    redirect_uri: redirectUri,
    audience: AUTH0_AUDIENCE,
    scope: "openid profile email",
    state: signed,
  });
  const conn = options?.connection?.trim();
  if (conn) {
    params.set("connection", conn);
  }
  return `https://${domain}/authorize?${params.toString()}`;
}

export const authenticationService: IAuthenticationService = {
  verifySessionToken: verifyAuth0SessionToken,
  principalFromJwtPayload: mapAuth0PayloadToPrincipal,
  completeOAuthLogin,
  buildOAuthLoginUrl,
};
