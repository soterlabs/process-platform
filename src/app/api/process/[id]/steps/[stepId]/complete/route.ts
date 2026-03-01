import { NextRequest, NextResponse } from "next/server";
import { executionService } from "@/services/execution-service";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; stepId: string } }
) {
  try {
    const { id, stepId } = params;
    const body = await request.json().catch(() => null);
    const payload = (body as Record<string, unknown> | null) ?? {};
    if (Object.keys(payload).length > 0) {
      await executionService.updateStepById(id, stepId, payload);
    }
    const result = await executionService.completeStepById(id, stepId);
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
