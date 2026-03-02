import { NextRequest, NextResponse } from "next/server";
import { createChallenge } from "@/services/authentication-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await createChallenge(body);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
