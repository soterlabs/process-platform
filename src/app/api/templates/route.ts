import { NextRequest, NextResponse } from "next/server";
import { ROLES } from "@/lib/roles";
import { requireRole } from "@/lib/require-role";
import { storageService } from "@/services/storage";

export async function GET(request: NextRequest) {
  const err = await requireRole(request, ROLES.ADMIN, { message: "Admin role required to list templates" });
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
