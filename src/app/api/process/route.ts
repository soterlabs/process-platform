import { NextRequest, NextResponse } from "next/server";
import { getPrincipalFromRequest } from "@/lib/auth-request";
import { principalDisplayName } from "@/lib/principal-display-name";
import { PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { executionService } from "@/services/execution-service";
import { storageService } from "@/services/storage";

type StartProcessBody = { templateKey: string };

export async function GET(request: NextRequest) {
  const err = requirePermission(request, PERMISSIONS.PROCESSES_READ, {
    message: "processes:read permission required",
  });
  if (err) return err;
  try {
    const processes = await storageService.listProcesses();
    return NextResponse.json(processes);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const err = requirePermission(request, PERMISSIONS.PROCESSES_WRITE, {
    message: "processes:write permission required",
  });
  if (err) return err;
  try {
    const principal = getPrincipalFromRequest(request);
    const { templateKey } = (await request.json()) as StartProcessBody;
    const triggeredBy = principal?.userId;
    const ranByName = principalDisplayName(principal);
    const result = await executionService.startProcess(templateKey, {
      triggeredBy,
      ranByName,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
