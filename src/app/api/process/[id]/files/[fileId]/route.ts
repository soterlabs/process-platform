import { NextRequest, NextResponse } from "next/server";
import { getPrincipalFromRequest } from "@/lib/auth-request";
import { PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { authorizationService } from "@/services/auth";
import { processContextReferencesFileId } from "@/entities/process";
import { executionService } from "@/services/execution-service";
import { processFileStorage } from "@/services/process-files";

function contentDispositionAttachment(filename: string): string {
  const safe = filename.replace(/[\r\n"]/g, "_").slice(0, 200) || "download";
  const encoded = encodeURIComponent(filename).replace(/'/g, "%27");
  return `attachment; filename="${safe}"; filename*=UTF-8''${encoded}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; fileId: string } }
) {
  const denied = requirePermission(request, PERMISSIONS.PROCESSES_READ, {
    message: "processes:read permission required",
  });
  if (denied) return denied;
  const { id: processId, fileId } = params;
  const process = await executionService.getProcessState(processId);
  if (!process) {
    return NextResponse.json({ error: "Process not found" }, { status: 404 });
  }
  if (!processContextReferencesFileId(process.context, fileId)) {
    return NextResponse.json({ error: "File not found for this process" }, { status: 404 });
  }
  const blob = await processFileStorage.readFile(processId, fileId);
  if (!blob) {
    return NextResponse.json({ error: "File bytes missing" }, { status: 404 });
  }
  return new NextResponse(new Uint8Array(blob.data), {
    status: 200,
    headers: {
      "Content-Type": blob.mimeType,
      "Content-Disposition": contentDispositionAttachment(blob.originalName),
      "Cache-Control": "private, no-store",
    },
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; fileId: string } }
) {
  const denied = requirePermission(request, PERMISSIONS.PROCESSES_WRITE, {
    message: "processes:write permission required",
  });
  if (denied) return denied;
  const principal = getPrincipalFromRequest(request)!;
  const { userId, permissions } = principal;
  const stepId = request.nextUrl.searchParams.get("stepId")?.trim();
  if (!stepId) {
    return NextResponse.json({ error: "Missing stepId query parameter" }, { status: 400 });
  }
  const { id: processId, fileId } = params;
  const auth = await authorizationService.checkStepAuth(processId, stepId, userId, permissions);
  if (!auth.authorized) {
    return NextResponse.json(auth.body, { status: auth.status });
  }
  await processFileStorage.deleteFile(processId, fileId);
  return NextResponse.json({ ok: true });
}
