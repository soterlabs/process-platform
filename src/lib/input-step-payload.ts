import type { TemplateStepInput } from "@/entities/template";

function numberFromFormString(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Hydrate a `number` form field from context: only finite JSON numbers. */
export function numberContextToFormString(val: unknown): string {
  if (typeof val !== "number" || !Number.isFinite(val)) return "";
  return String(val);
}

/** Stable form-state key for a sub-field on row `rowIndex` of an `item_list` named `listKey`. */
export function itemListFormKey(listKey: string, rowIndex: number, subKey: string): string {
  return JSON.stringify(["il", listKey, rowIndex, subKey]);
}

export function tryParseItemListFormKey(
  key: string
): { listKey: string; rowIndex: number; subKey: string } | null {
  try {
    const a = JSON.parse(key) as unknown;
    if (!Array.isArray(a) || a.length !== 4 || a[0] !== "il") return null;
    const listKey = String(a[1]);
    const rowIndex = Number(a[2]);
    const subKey = String(a[3]);
    if (!Number.isInteger(rowIndex) || rowIndex < 0) return null;
    return { listKey, rowIndex, subKey };
  } catch {
    return null;
  }
}

function serializeInputValue(
  inp: TemplateStepInput,
  raw: boolean | string | undefined
): unknown {
  if (inp.type === "bool") {
    return raw ?? false;
  }
  if (inp.type === "number") {
    const s = raw === undefined || raw === true || raw === false ? "" : String(raw);
    return numberFromFormString(s);
  }
  if (inp.type === "decimal_string") {
    const s = raw === undefined || raw === true || raw === false ? "" : String(raw).trim();
    return s;
  }
  return raw ?? "";
}

function nonEmptyLinesFromMultiline(formValues: Record<string, boolean | string>, linesFromKey: string): string[] {
  const raw = formValues[linesFromKey];
  const s = raw === undefined || raw === true || raw === false ? "" : String(raw);
  return s.split("\n").map((t) => t.trim()).filter(Boolean);
}

function serializeItemList(
  list: TemplateStepInput,
  formValues: Record<string, boolean | string>
): unknown[] {
  if (list.type !== "item_list" || !list.linesFromKey || !Array.isArray(list.subInputs)) {
    return [];
  }
  const lines = nonEmptyLinesFromMultiline(formValues, list.linesFromKey);
  const subInputs = list.subInputs;
  return lines.map((_, rowIndex) => {
    const row: Record<string, unknown> = {};
    for (const sub of subInputs) {
      if (sub.readOnly || sub.type === "item_list") continue;
      const fk = itemListFormKey(list.key, rowIndex, sub.key);
      if (!(fk in formValues)) continue;
      row[sub.key] = serializeInputValue(sub, formValues[fk]);
    }
    return row;
  });
}

/**
 * Payload merged into `process.context[stepKey]` from form state (scalar inputs + `item_list` arrays).
 */
export function buildInputStepContextPayload(
  inputs: TemplateStepInput[],
  formValues: Record<string, boolean | string>
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  const itemLists = inputs.filter((i): i is TemplateStepInput & { type: "item_list" } => i.type === "item_list");
  const scalars = inputs.filter((i) => i.type !== "item_list");

  for (const inp of scalars) {
    if (inp.readOnly) continue;
    if (!(inp.key in formValues)) continue;
    payload[inp.key] = serializeInputValue(inp, formValues[inp.key]);
  }
  for (const list of itemLists) {
    if (list.readOnly) continue;
    payload[list.key] = serializeItemList(list, formValues);
  }
  return payload;
}
