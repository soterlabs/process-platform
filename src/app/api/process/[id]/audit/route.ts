import { NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { executionService } from "@/services/execution-service";
import { storageService } from "@/services/storage";

/**
 * Full persisted process state for auditors (includes stepContextAudit and embedded template).
 * Requires processes:audit (separate from processes:read).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const denied = requirePermission(request, PERMISSIONS.PROCESSES_AUDIT, {
    message: "processes:audit permission required",
  });
  if (denied) return denied;
  try {
    const { id } = params;
    const result = await executionService.getProcessState(id);
    if (!result) {
      return NextResponse.json(
        { error: `Process not found: ${id}` },
        { status: 404 }
      );
    }
    let template = result.template;
    try {
      const latest = await storageService.getTemplate(result.template.key);
      if (latest) template = latest;
    } catch {
      // keep embedded template
    }
    return NextResponse.json({
      ...result,
      template,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
