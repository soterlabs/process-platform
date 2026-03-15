import { NextRequest, NextResponse } from "next/server";
import { authenticationService } from "@/services/auth";

type VerifyGoogleBody = { idToken: string };

export async function POST(request: NextRequest) {
  try {
    const { idToken } = (await request.json()) as VerifyGoogleBody;
    const result = await authenticationService.verifyGoogleIdTokenAndIssueToken(idToken);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Verification failed";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
