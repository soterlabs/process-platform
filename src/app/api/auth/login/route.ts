import { NextRequest, NextResponse } from "next/server";
import { authenticationService } from "@/services/auth";
import { safeReturnPath } from "@/services/auth/authentication";

export async function GET(request: NextRequest) {
  const returnUrl = request.nextUrl.searchParams.get("returnUrl") ?? "/";
  const connection = request.nextUrl.searchParams.get("connection")?.trim() || undefined;
  try {
    const url = await authenticationService.buildOAuthLoginUrl(safeReturnPath(returnUrl), {
      connection,
    });
    return NextResponse.redirect(url);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login is not configured.";
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(message)}`, request.url)
    );
  }
}
