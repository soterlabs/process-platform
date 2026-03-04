import { NextResponse } from "next/server";
import { storageService } from "@/services/storage-service";

export async function GET() {
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
