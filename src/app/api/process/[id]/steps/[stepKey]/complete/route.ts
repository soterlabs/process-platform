import { NextRequest, NextResponse } from "next/server";
import { executionService } from "@/services/execution-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stepKey: string }> }
) {
  try {
    const { id, stepKey } = await params;
    const payload = ((await request.json()) as Record<string, unknown>) ?? {};
    const result = await executionService.completeStepAndAdvance(id, stepKey, payload);
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
