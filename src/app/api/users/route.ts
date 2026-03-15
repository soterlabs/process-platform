import { NextRequest, NextResponse } from "next/server";
import { ROLES } from "@/lib/roles";
import { requireRole } from "@/lib/require-role";
import { storageService } from "@/services/storage";

type CreateUserBody = { id: string; evmWalletAddress?: string; email?: string };

export async function GET(request: NextRequest) {
  const err = await requireRole(request, ROLES.ADMIN);
  if (err) return err;
  try {
    const users = await storageService.listUsers();
    return NextResponse.json(users);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const err = await requireRole(request, ROLES.ADMIN);
  if (err) return err;
  try {
    const { id, evmWalletAddress, email } = (await request.json()) as CreateUserBody;
    const trimmedId = id?.trim();
    if (!trimmedId) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }
    const existing = await storageService.getUser(trimmedId);
    if (existing) {
      return NextResponse.json(
        { error: "User with this id already exists" },
        { status: 409 }
      );
    }

    const user = {
      id: trimmedId,
      type: "user" as const,
      ...(evmWalletAddress?.trim() && {
        evmWalletAddress: evmWalletAddress.trim().toLowerCase() as `0x${string}`,
      }),
      ...(email?.trim() && { email: email.trim().toLowerCase() }),
    };
    await storageService.setUser(user.id, user);
    return NextResponse.json(user, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
