import { NextRequest, NextResponse } from "next/server";
import { getPrincipalFromRequest } from "@/lib/auth-request";

export async function GET(request: NextRequest) {
  const principal = getPrincipalFromRequest(request);
  if (!principal) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { userId, permissions, email } = principal;
  return NextResponse.json({ userId, permissions, ...(email ? { email } : {}) });
}
