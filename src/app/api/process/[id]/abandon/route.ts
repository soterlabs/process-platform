import { NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { executionService } from "@/services/execution-service";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const err = requirePermission(request, PERMISSIONS.PROCESSES_WRITE, {
    message: "processes:write permission required",
  });
  if (err) return err;
  try {
    const { id } = params;
    const process = await executionService.completeProcessById(id);
    return NextResponse.json(process);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (message.includes("not running")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
