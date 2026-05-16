import type { ProcessFileRef } from "@/entities/process";
import { isProcessFileRef } from "@/entities/process";
import type { TemplateStepInput } from "@/entities/template";

/** Single `${stepKey.fieldKey}` path from a read-only control `defaultValue`. */
export function contextPathFromDefaultValue(data: string | undefined): string | null {
  if (!data?.trim()) return null;
  const m = /^\$\{([^}]+)\}\s*$/.exec(data.trim());
  return m ? m[1].trim() : null;
}

export function getContextValue(context: Record<string, unknown>, path: string): unknown {
  const dot = path.indexOf(".");
  const stepKey = dot >= 0 ? path.slice(0, dot) : path;
  const fieldKey = dot >= 0 ? path.slice(dot + 1) : path;
  const stepData = context[stepKey] as Record<string, unknown> | undefined;
  return stepData?.[fieldKey];
}

/**
 * When `data` is a single `${stepKey.fieldKey}` placeholder pointing at file ref(s), returns those
 * refs for download UI. Returns `null` when `data` is not a lone path or the value is not file-shaped.
 */
export function fileRefsForResultViewData(
  data: string,
  context: Record<string, unknown>
): ProcessFileRef[] | null {
  const path = contextPathFromDefaultValue(data);
  if (!path) return null;
  const raw = getContextValue(context, path);
  if (isProcessFileRef(raw)) return [raw];
  if (Array.isArray(raw)) {
    const refs = raw.filter(isProcessFileRef);
    return refs.length > 0 || raw.length === 0 ? refs : null;
  }
  if (raw === null || raw === undefined) return [];
  return null;
}

/** Resolve file ref(s) for a read-only `file-single` / `file-multiple` field. */
export function resolveReadOnlyFileRefs(
  inp: Pick<TemplateStepInput, "key" | "type" | "defaultValue">,
  context: Record<string, unknown>,
  currentStepKey?: string
): ProcessFileRef[] {
  const path = contextPathFromDefaultValue(inp.defaultValue);
  let raw: unknown;
  if (path) {
    raw = getContextValue(context, path);
  } else if (currentStepKey) {
    const slice = context[currentStepKey] as Record<string, unknown> | undefined;
    raw = slice?.[inp.key];
  } else {
    return [];
  }
  if (inp.type === "file-single") {
    return isProcessFileRef(raw) ? [raw] : [];
  }
  if (inp.type === "file-multiple") {
    return Array.isArray(raw) ? raw.filter(isProcessFileRef) : [];
  }
  return [];
}
