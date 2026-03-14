import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { storageService } from "@/services/storage";

export async function GET(request: NextRequest) {
  const err = await requireAdmin(request);
  if (err) return err;
  try {
    const memberships = await storageService.listGroupMemberships();
    return NextResponse.json(memberships);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
