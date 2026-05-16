/**
 * Reference stored in process context for uploaded files (never raw bytes).
 * Physical bytes live under {@link IProcessFileStorage} keyed by processId + id.
 */
export type ProcessFileRef = {
  kind: "process_file";
  id: string;
  name: string;
  mimeType: string;
  size: number;
};

export function toProcessFileRef(meta: {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
}): ProcessFileRef {
  return {
    kind: "process_file",
    id: meta.id,
    name: meta.originalName,
    mimeType: meta.mimeType,
    size: meta.size,
  };
}

export function isProcessFileRef(v: unknown): v is ProcessFileRef {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    o.kind === "process_file" &&
    typeof o.id === "string" &&
    typeof o.name === "string" &&
    typeof o.mimeType === "string" &&
    typeof o.size === "number" &&
    Number.isFinite(o.size) &&
    o.size >= 0
  );
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isProcessFileId(id: string): boolean {
  return UUID_RE.test(id);
}

/** True if `fileId` appears anywhere in serialized process context (nested objects/arrays). */
export function processContextReferencesFileId(
  context: Record<string, unknown>,
  fileId: string
): boolean {
  const seen = new Set<unknown>();
  function walk(v: unknown): boolean {
    if (v === null || v === undefined) return false;
    if (typeof v !== "object") return false;
    if (seen.has(v)) return false;
    seen.add(v);
    if (isProcessFileRef(v)) return v.id === fileId;
    if (Array.isArray(v)) return v.some(walk);
    return Object.values(v as Record<string, unknown>).some(walk);
  }
  return walk(context);
}
