import { NextRequest, NextResponse } from "next/server";
import { storageService } from "@/services/storage-service";
import type { Template } from "@/entities/template";

export async function GET(
  _request: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    const { key } = params;
    const template = await storageService.getTemplate(key);
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }
    return NextResponse.json(template);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    const { key } = params;
    const body = (await request.json()) as Template;
    if (body.key !== key) {
      return NextResponse.json(
        { error: "Template key in body must match URL" },
        { status: 400 }
      );
    }
    await storageService.setTemplate(key, body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
