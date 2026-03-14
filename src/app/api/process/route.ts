import { NextRequest, NextResponse } from "next/server";
import { executionService } from "@/services/execution-service";
import { storageService } from "@/services/storage";

export async function GET(_request: NextRequest) {
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
  try {
    const { templateKey } = (await request.json()) as { templateKey: string };
    const result = await executionService.startProcess(templateKey);
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
