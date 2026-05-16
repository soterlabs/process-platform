import { NextRequest, NextResponse } from "next/server";
import { getPrincipalFromRequest } from "@/lib/auth-request";
import { PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { authorizationService } from "@/services/auth";
import { toProcessFileRef } from "@/entities/process";
import { processFileStorage } from "@/services/process-files";

const DEFAULT_MAX_BYTES = 50 * 1024 * 1024;

function maxUploadBytes(): number {
  const raw = process.env.MAX_PROCESS_FILE_BYTES?.trim();
  if (!raw) return DEFAULT_MAX_BYTES;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_BYTES;
}

function sanitizeOriginalName(name: string): string {
  return name.replace(/[\r\n\0]/g, "").slice(0, 512) || "upload";
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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
  const { id: processId } = params;
  const auth = await authorizationService.checkStepAuth(processId, stepId, userId, permissions);
  if (!auth.authorized) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  const maxBytes = maxUploadBytes();
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }
  const entry = formData.get("file");
  if (!(entry instanceof Blob)) {
    return NextResponse.json({ error: "Missing file field" }, { status: 400 });
  }
  const originalName = sanitizeOriginalName(
    typeof (entry as File).name === "string" ? (entry as File).name : "upload"
  );
  const mimeType =
    typeof (entry as File).type === "string" && (entry as File).type
      ? (entry as File).type
      : "application/octet-stream";
  const ab = await entry.arrayBuffer();
  const buf = Buffer.from(ab);
  if (buf.length > maxBytes) {
    return NextResponse.json(
      { error: `File too large (max ${maxBytes} bytes)` },
      { status: 413 }
    );
  }
  if (buf.length === 0) {
    return NextResponse.json({ error: "Empty file" }, { status: 400 });
  }

  const saved = await processFileStorage.saveFile(processId, buf, {
    originalName,
    mimeType,
  });
  return NextResponse.json({ file: toProcessFileRef(saved) });
}
