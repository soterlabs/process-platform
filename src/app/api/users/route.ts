import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { storageService } from "@/services/storage";

export async function GET(request: NextRequest) {
  const err = await requireAdmin(request);
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
  const err = await requireAdmin(request);
  if (err) return err;
  try {
    const body = (await request.json()) as { id: string; evmWalletAddress: string };
    const { id, evmWalletAddress } = body;
    if (!id?.trim() || !evmWalletAddress?.trim()) {
      return NextResponse.json(
        { error: "id and evmWalletAddress are required" },
        { status: 400 }
      );
    }
    const normalized = evmWalletAddress.toLowerCase();
    if (!normalized.startsWith("0x") || normalized.length < 10) {
      return NextResponse.json(
        { error: "evmWalletAddress must be a valid Ethereum address" },
        { status: 400 }
      );
    }
    const existing = await storageService.getUser(id.trim());
    if (existing) {
      return NextResponse.json(
        { error: "User with this id already exists" },
        { status: 409 }
      );
    }
    const existingByAddress = await storageService.getUserByEvmAddress(normalized as `0x${string}`);
    if (existingByAddress) {
      return NextResponse.json(
        { error: "A user with this wallet address already exists" },
        { status: 409 }
      );
    }
    const user = {
      id: id.trim(),
      type: "user" as const,
      evmWalletAddress: normalized as `0x${string}`,
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
