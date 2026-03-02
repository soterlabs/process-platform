import { NextRequest, NextResponse } from "next/server";
import { verify } from "@/services/authentication-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await verify(body);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Verification failed";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
