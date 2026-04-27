import { NextRequest, NextResponse } from "next/server";
import { getPrincipalFromRequest } from "@/lib/auth-request";
import { PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { authorizationService } from "@/services/auth";
import { executionService } from "@/services/execution-service";

type CompleteStepBody = Record<string, unknown>;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; stepId: string } }
) {
  const denied = requirePermission(request, PERMISSIONS.PROCESSES_WRITE, {
    message: "processes:write permission required",
  });
  if (denied) return denied;
  const principal = getPrincipalFromRequest(request)!;
  const { userId, permissions } = principal;
  try {
    const { id, stepId } = params;
    const body = await request.json().catch(() => null);
    const payload = (body as CompleteStepBody | null) ?? {};
    const auth = await authorizationService.checkStepAuth(id, stepId, userId, permissions, {
      intent: "complete",
      mergeStepContextPayload: payload,
    });
    if (!auth.authorized) {
      return NextResponse.json(auth.body, { status: auth.status });
    }
    if (Object.keys(payload).length > 0) {
      await executionService.updateStepById(id, stepId, payload, userId);
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
