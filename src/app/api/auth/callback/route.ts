import { NextRequest, NextResponse } from "next/server";
import { AUTH_TOKEN_STORAGE_KEY } from "@/lib/auth-client";
import { authenticationService } from "@/services/auth";
import { safeReturnPath } from "@/services/auth/authentication";

function handoffHtml(token: string, returnPath: string): string {
  const safeToken = JSON.stringify(token);
  const safePath = JSON.stringify(returnPath);
  const key = JSON.stringify(AUTH_TOKEN_STORAGE_KEY);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Signing in</title></head><body><script>
(function(){
  try {
    localStorage.setItem(${key}, ${safeToken});
  } catch (e) {}
  location.replace(${safePath});
})();
</script><p class="text-stone-400">Signing in…</p></body></html>`;
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const oauthError = url.searchParams.get("error");
  const desc = url.searchParams.get("error_description");
  if (oauthError) {
    const msg = desc ?? oauthError;
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(msg)}`, request.url)
    );
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code?.trim() || !state?.trim()) {
    return NextResponse.redirect(
      new URL("/login?error=missing_code", request.url)
    );
  }

  const base = process.env.APP_BASE_URL?.replace(/\/$/, "");
  if (!base) {
    return NextResponse.redirect(
      new URL("/login?error=app_base_url_missing", request.url)
    );
  }
  const redirectUri = `${base}/api/auth/callback`;

  try {
    const { token, returnUrl } = await authenticationService.completeOAuthLogin({
      code,
      state,
      redirectUri,
    });
    const path = safeReturnPath(returnUrl);
    return new NextResponse(handoffHtml(token, path), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "sign_in_failed";
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(message)}`, request.url)
    );
  }
}
