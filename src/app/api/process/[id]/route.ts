import { NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { authorizationService } from "@/services/auth";
import { executionService } from "@/services/execution-service";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const gate = await requirePermission(request, PERMISSIONS.PROCESSES_READ, {
    message: "processes:read permission required",
  });
  if (gate instanceof NextResponse) return gate;
  const principal = gate;
  const { userId, permissions } = principal;
  try {
    const { id } = params;
    const result = await executionService.getProcessState(id);
    if (!result) {
      return NextResponse.json(
        { error: `Process not found: ${id}` },
        { status: 404 }
      );
    }
    const canActOnCurrentStep = authorizationService.canUserActOnCurrentStep(
      result,
      userId,
      permissions
    );
    return NextResponse.json({ ...result, canActOnCurrentStep });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
