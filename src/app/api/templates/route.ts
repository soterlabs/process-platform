import { NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { storageService } from "@/services/storage";

export async function GET(request: NextRequest) {
  const err = requirePermission(request, PERMISSIONS.TEMPLATES_READ, {
    message: "templates:read permission required to list templates",
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
