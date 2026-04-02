import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/jwt";

const PUBLIC_API_PATHS = [
  "/api/auth/challenge",
  "/api/auth/verify",
  "/api/auth/verify-google",
];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (PUBLIC_API_PATHS.some((p) => pathname === p)) {
    return NextResponse.next();
  }
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = auth.slice(7).trim();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requestHeaders = new Headers(request.headers);
  const headerUserId = request.headers.get("x-user-id")?.trim();
  const effectiveUserId =
    headerUserId && headerUserId.length > 0 ? headerUserId : payload.userId;
  requestHeaders.set("x-user-id", effectiveUserId);
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ["/api/:path*"],
};
