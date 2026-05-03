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

/** True when every writable sub-field on this row is “empty” (no user meaning). */
export function itemListRowIsEmpty(
  listKey: string,
  subs: TemplateStepInput[],
  rowIndex: number,
  formValues: Record<string, boolean | string>
): boolean {
  for (const sub of subs) {
    if (sub.readOnly || sub.type === "item_list") continue;
    const fk = itemListFormKey(listKey, rowIndex, sub.key);
    const raw = formValues[fk];
    if (sub.type === "bool") {
      if (raw === true) return false;
      continue;
    }
    if (raw !== undefined && raw !== true && raw !== false && String(raw).trim() !== "") {
      return false;
    }
  }
  return true;
}

/**
 * How many rows to render: every non-empty row plus one trailing empty row for the next item
 * (minimum 1 when there is at least one sub-field).
 */
export function itemListRenderRowCount(
  listKey: string,
  subs: TemplateStepInput[] | undefined,
  formValues: Record<string, boolean | string>
): number {
  const list = subs ?? [];
  if (list.length === 0) return 0;
  let lastNonEmpty = -1;
  for (let r = 0; r < 500; r++) {
    if (!itemListRowIsEmpty(listKey, list, r, formValues)) lastNonEmpty = r;
  }
  return Math.max(1, lastNonEmpty + 2);
}

/** Last row index that has any writable data (for compaction). */
function itemListLastFilledRowIndex(
  listKey: string,
  subs: TemplateStepInput[],
  formValues: Record<string, boolean | string>
): number {
  let high = -1;
  for (let r = 0; r < 500; r++) {
    if (!itemListRowIsEmpty(listKey, subs, r, formValues)) high = r;
  }
  return high;
}

/**
 * Remove one item row: shift following rows up and clear the last filled row.
 * `subs` must be the full template `subInputs` (same keys used in form state).
 */
export function removeItemListRow(
  listKey: string,
  subs: TemplateStepInput[],
  removedIndex: number,
  formValues: Record<string, boolean | string>
): Record<string, boolean | string> {
  const next = { ...formValues };
  const high = itemListLastFilledRowIndex(listKey, subs, next);
  if (removedIndex < 0 || removedIndex > high || high < 0) return next;

  const writableSubs = subs.filter((s) => !s.readOnly && s.type !== "item_list");

  for (let r = removedIndex; r < high; r++) {
    for (const sub of writableSubs) {
      const fromFk = itemListFormKey(listKey, r + 1, sub.key);
      const toFk = itemListFormKey(listKey, r, sub.key);
      next[toFk] = fromFk in next ? next[fromFk]! : sub.type === "bool" ? false : "";
    }
  }
  for (const sub of writableSubs) {
    const fk = itemListFormKey(listKey, high, sub.key);
    next[fk] = sub.type === "bool" ? false : "";
  }
  return next;
}

/**
 * Reorder item-list rows (including the trailing empty row slot) by moving `fromIndex` to `toIndex`.
 */
export function reorderItemListRows(
  listKey: string,
  subs: TemplateStepInput[],
  fromIndex: number,
  toIndex: number,
  formValues: Record<string, boolean | string>
): Record<string, boolean | string> {
  if (fromIndex === toIndex) return formValues;
  const rowCount = itemListRenderRowCount(listKey, subs, formValues);
  if (fromIndex < 0 || fromIndex >= rowCount || toIndex < 0 || toIndex >= rowCount) {
    return formValues;
  }

  const writableSubs = subs.filter((s) => !s.readOnly && s.type !== "item_list");
  const snapshots: Record<string, boolean | string>[] = [];
  for (let r = 0; r < rowCount; r++) {
    const snap: Record<string, boolean | string> = {};
    for (const sub of writableSubs) {
      const fk = itemListFormKey(listKey, r, sub.key);
      snap[sub.key] = fk in formValues ? formValues[fk]! : sub.type === "bool" ? false : "";
    }
    snapshots.push(snap);
  }

  const [moved] = snapshots.splice(fromIndex, 1);
  snapshots.splice(toIndex, 0, moved);

  const next = { ...formValues };
  for (let r = 0; r < rowCount; r++) {
    for (const sub of writableSubs) {
      const fk = itemListFormKey(listKey, r, sub.key);
      next[fk] = snapshots[r][sub.key];
    }
  }
  return next;
}

function serializeItemList(
  list: TemplateStepInput,
  formValues: Record<string, boolean | string>
): unknown[] {
  if (list.type !== "item_list" || !Array.isArray(list.subInputs) || list.subInputs.length === 0) {
    return [];
  }
  const subs = list.subInputs;
  const out: Record<string, unknown>[] = [];
  for (let rowIndex = 0; rowIndex < 500; rowIndex++) {
    if (itemListRowIsEmpty(list.key, subs, rowIndex, formValues)) break;
    const row: Record<string, unknown> = {};
    for (const sub of subs) {
      if (sub.readOnly || sub.type === "item_list") continue;
      const fk = itemListFormKey(list.key, rowIndex, sub.key);
      row[sub.key] = serializeInputValue(sub, fk in formValues ? formValues[fk] : undefined);
    }
    out.push(row);
  }
  return out;
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
