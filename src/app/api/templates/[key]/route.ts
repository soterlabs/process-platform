import { NextRequest, NextResponse } from "next/server";
import type { Template } from "@/entities/template";
import { PERMISSIONS } from "@/lib/permissions";
import { requirePermission } from "@/lib/require-permission";
import { storageService } from "@/services/storage";

type PutTemplateBody = Template;

export async function GET(
  request: NextRequest,
  { params }: { params: { key: string } }
) {
  const gate = await requirePermission(request, PERMISSIONS.TEMPLATES_READ, {
    message: "templates:read permission required to view templates",
  });
  if (gate instanceof NextResponse) return gate;
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
  const gate = await requirePermission(request, PERMISSIONS.TEMPLATES_WRITE, {
    message: "templates:write permission required to create or edit templates",
  });
  if (gate instanceof NextResponse) return gate;
  try {
    const { key } = params;
    const body = (await request.json()) as PutTemplateBody;
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
