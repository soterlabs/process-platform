import { NextRequest, NextResponse } from "next/server";
import { authenticationService } from "@/services/auth";

type ChallengeBody = { walletAddress: string };

export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = (await request.json()) as ChallengeBody;
    const result = await authenticationService.createChallenge(walletAddress);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
