import { NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { storageService } from "@/services/storage";

/**
 * List templates available to start a process (requires processes:read).
 * For full template definitions / editing, use GET/PUT /api/templates (templates:read / templates:write).
 */
export async function GET(request: NextRequest) {
  const err = requirePermission(request, PERMISSIONS.PROCESSES_READ, {
    message: "processes:read permission required",
  });
  if (err) return err;
  try {
    const templates = await storageService.listTemplates();
    return NextResponse.json(templates);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
