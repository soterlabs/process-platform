import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/auth-request";
import { authorizationService } from "@/services/auth";
import { executionService } from "@/services/execution-service";

type CompleteStepBody = Record<string, unknown>;

export async function POST(
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
    const body = await request.json().catch(() => null);
    const payload = (body as CompleteStepBody | null) ?? {};
    if (Object.keys(payload).length > 0) {
      await executionService.updateStepById(id, stepId, payload);
    }
    const result = await executionService.completeStepById(id, stepId, userId);
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
