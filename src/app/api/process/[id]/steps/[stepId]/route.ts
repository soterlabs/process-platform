import { NextRequest, NextResponse } from "next/server";
import { executionService } from "@/services/execution-service";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; stepId: string } }
) {
  try {
    const { id, stepId } = params;
    const payload = (await request.json()) as Record<string, unknown>;
    const result = await executionService.updateStepById(id, stepId, payload);
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
