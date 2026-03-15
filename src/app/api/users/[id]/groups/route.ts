import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/auth-request";
import { groupMembershipKey } from "@/entities/principal";
import { ROLES } from "@/lib/roles";
import { requireRole } from "@/lib/require-role";
import { storageService } from "@/services/storage";

type AddUserToGroupBody = { groupId: string };

/** List groups the user belongs to (returns memberships for this user). */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const err = await requireRole(request, ROLES.ADMIN);
  if (err) return err;
  const targetUserId = params.id;
  try {
    const all = await storageService.listGroupMemberships();
    const memberships = all.filter((m) => m.userId === targetUserId);
    return NextResponse.json(memberships);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/** Add user to a group. Body: { groupId: string } */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const err = await requireRole(request, ROLES.ADMIN);
  if (err) return err;
  const userId = getUserIdFromRequest(request)!;
  const targetUserId = params.id;
  try {
    const { groupId } = (await request.json()) as AddUserToGroupBody;
    const user = await storageService.getUser(targetUserId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const group = await storageService.getGroup(groupId);
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }
    const key = groupMembershipKey(groupId, targetUserId);
    const existing = await storageService.getGroupMembership(key);
    if (existing) {
      return NextResponse.json(
        { error: "User is already in this group" },
        { status: 409 }
      );
    }
    const membership = {
      userId: targetUserId,
      groupId,
      addedAt: new Date().toISOString(),
      addedById: userId,
    };
    await storageService.setGroupMembership(key, membership);
    return NextResponse.json(membership, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
