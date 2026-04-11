import { NextRequest, NextResponse } from "next/server";
import { getPrincipalFromRequest } from "@/lib/auth-request";
import { PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { authorizationService } from "@/services/auth";
import { executionService } from "@/services/execution-service";
import { storageService } from "@/services/storage";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const denied = requirePermission(request, PERMISSIONS.PROCESSES_READ, {
    message: "processes:read permission required",
  });
  if (denied) return denied;
  const principal = getPrincipalFromRequest(request)!;
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
    /** Use latest template definition from storage so readOnly defaultValue / inputs stay current. */
    let template = result.template;
    try {
      const latest = await storageService.getTemplate(result.template.key);
      if (latest) template = latest;
    } catch {
      // keep embedded template
    }
    return NextResponse.json({ ...result, template, canActOnCurrentStep });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
