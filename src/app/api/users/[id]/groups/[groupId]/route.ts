import { NextRequest, NextResponse } from "next/server";
import { groupMembershipKey } from "@/entities/principal";
import { ROLES } from "@/lib/roles";
import { requireRole } from "@/lib/require-role";
import { storageService } from "@/services/storage";

/** Remove user from a group. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; groupId: string } }
) {
  const err = await requireRole(request, ROLES.ADMIN);
  if (err) return err;
  const { id: targetUserId, groupId } = params;
  try {
    const key = groupMembershipKey(groupId, targetUserId);
    const existing = await storageService.getGroupMembership(key);
    if (!existing) {
      return NextResponse.json(
        { error: "User is not in this group" },
        { status: 404 }
      );
    }
    await storageService.deleteGroupMembership(key);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
