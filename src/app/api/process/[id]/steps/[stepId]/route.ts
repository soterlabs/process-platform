import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/auth-request";
import { authorizationService } from "@/services/auth";
import { executionService } from "@/services/execution-service";

type UpdateStepBody = Record<string, unknown>;

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; stepId: string } }
) {
  const userId = getUserIdFromRequest(request)!;
  try {
    const { id, stepId } = params;
    const auth = await authorizationService.checkStepAuth(id, stepId, userId);
    if (!auth.authorized) {
      return NextResponse.json(auth.body, { status: auth.status });
    }
    const payload = (await request.json()) as UpdateStepBody;
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
