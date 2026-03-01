import { NextRequest, NextResponse } from "next/server";
import { executionService } from "@/services/execution-service";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const result = await executionService.getProcessState(id);
    if (!result) {
      return NextResponse.json(
        { error: `Process not found: ${id}` },
        { status: 404 }
      );
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
