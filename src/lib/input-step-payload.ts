import { isProcessFileRef, type ProcessFileRef } from "@/entities/process";
import type { TemplateStepInput } from "@/entities/template";

export type ItemListPath = readonly (string | number)[];

/** Form-only meta: how many rows to render for a list at `listPath` (not persisted to process context). */
export function formKeyForItemListRowCount(listPath: ItemListPath): string {
  return JSON.stringify(["il-meta", ...listPath, "rowCount"]);
}

export function getItemListRowCount(
  listPath: ItemListPath,
  formValues: Record<string, boolean | string>
): number {
  const k = formKeyForItemListRowCount(listPath);
  const raw = formValues[k];
  if (raw === undefined || raw === true || raw === false) return 0;
  const n = Number.parseInt(String(raw), 10);
  return Number.isInteger(n) && n >= 0 ? n : 0;
}

function setItemListRowCount(
  listPath: ItemListPath,
  formValues: Record<string, boolean | string>,
  count: number
): Record<string, boolean | string> {
  const k = formKeyForItemListRowCount(listPath);
  return { ...formValues, [k]: String(Math.max(0, count)) };
}

/** Append one empty row at the end of the list. */
export function addItemListRow(
  listPath: ItemListPath,
  formValues: Record<string, boolean | string>
): Record<string, boolean | string> {
  const count = getItemListRowCount(listPath, formValues);
  return setItemListRowCount(listPath, formValues, count + 1);
}

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

/**
 * Form key for one cell: `["il", ...listPath, rowIndex, subKey]`.
 * `listPath` locates the list instance: `[rootListKey]` or `[rootListKey, parentRow, nestedKey, ...]`.
 */
export function formKeyForItemListCell(
  listPath: ItemListPath,
  rowIndex: number,
  subKey: string
): string {
  return JSON.stringify(["il", ...listPath, rowIndex, subKey]);
}

/** @deprecated Use `formKeyForItemListCell([listKey], rowIndex, subKey)`. */
export function itemListFormKey(listKey: string, rowIndex: number, subKey: string): string {
  return formKeyForItemListCell([listKey], rowIndex, subKey);
}

export function parseItemListFormKey(key: string): { segments: (string | number)[] } | null {
  try {
    const a = JSON.parse(key) as unknown;
    if (!Array.isArray(a) || a[0] !== "il" || a.length < 4) return null;
    const segments = a.slice(1) as (string | number)[];
    if (segments.length < 3) return null;
    return { segments };
  } catch {
    return null;
  }
}

/** Legacy: only flat keys `["il", listKey, row, subKey]`. */
export function tryParseItemListFormKey(
  key: string
): { listKey: string; rowIndex: number; subKey: string } | null {
  const p = parseItemListFormKey(key);
  if (!p || p.segments.length !== 3) return null;
  const listKey = String(p.segments[0]);
  const rowIndex = Number(p.segments[1]);
  const subKey = String(p.segments[2]);
  if (!Number.isInteger(rowIndex) || rowIndex < 0) return null;
  return { listKey, rowIndex, subKey };
}

function segmentsMatchListPathPrefix(
  segments: readonly (string | number)[],
  listPath: ItemListPath
): boolean {
  if (segments.length < listPath.length) return false;
  for (let i = 0; i < listPath.length; i++) {
    if (segments[i] !== listPath[i]) return false;
  }
  return true;
}

export function belongsToRowAtListLevel(
  segments: readonly (string | number)[],
  listPath: ItemListPath,
  rowIndex: number
): boolean {
  if (!segmentsMatchListPathPrefix(segments, listPath)) return false;
  if (segments.length <= listPath.length) return false;
  return segments[listPath.length] === rowIndex;
}

export function parseFileFieldFromContext(
  inp: TemplateStepInput,
  raw: unknown
): ProcessFileRef | ProcessFileRef[] | null {
  if (inp.type === "file-single") {
    if (raw === undefined || raw === null) return null;
    return isProcessFileRef(raw) ? raw : null;
  }
  if (inp.type === "file-multiple") {
    if (!Array.isArray(raw)) return [];
    return raw.filter(isProcessFileRef);
  }
  return null;
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

function cellIsNonEmptyScalar(
  inp: TemplateStepInput,
  raw: boolean | string | undefined
): boolean {
  if (inp.type === "bool") {
    return raw === true;
  }
  if (raw === undefined || raw === true || raw === false) {
    return false;
  }
  return String(raw).trim() !== "";
}

/**
 * True when every writable scalar sub-field and every nested `item_list` column (any row) are
 * empty for this row.
 */
export function itemListRowIsEmpty(
  listInput: TemplateStepInput & { type: "item_list" },
  listPath: ItemListPath,
  rowIndex: number,
  formValues: Record<string, boolean | string>
): boolean {
  const subs = listInput.subInputs ?? [];

  for (const sub of subs) {
    if (sub.readOnly) continue;
    if (sub.type === "item_list") {
      const nested = sub as TemplateStepInput & { type: "item_list" };
      const nestedPath = [...listPath, rowIndex, sub.key];
      const nestedCount = getItemListRowCount(nestedPath, formValues);
      for (let nr = 0; nr < nestedCount; nr++) {
        if (!itemListRowIsEmpty(nested, nestedPath, nr, formValues)) return false;
      }
      continue;
    }
    const fk = formKeyForItemListCell(listPath, rowIndex, sub.key);
    if (cellIsNonEmptyScalar(sub, formValues[fk])) return false;
  }
  return true;
}

/** How many rows to render (explicit count from form meta). */
export function itemListRenderRowCount(
  _listInput: TemplateStepInput & { type: "item_list" },
  listPath: ItemListPath,
  formValues: Record<string, boolean | string>
): number {
  return getItemListRowCount(listPath, formValues);
}

export function snapshotRowAtList(
  formValues: Record<string, boolean | string>,
  listPath: ItemListPath,
  rowIndex: number
): Record<string, boolean | string> {
  const out: Record<string, boolean | string> = {};
  for (const [k, v] of Object.entries(formValues)) {
    const p = parseItemListFormKey(k);
    if (!p) continue;
    if (!belongsToRowAtListLevel(p.segments, listPath, rowIndex)) continue;
    const tail = p.segments.slice(listPath.length + 1);
    const nk = JSON.stringify(["il", ...listPath, 0, ...tail]);
    out[nk] = v;
  }
  return out;
}

function applySnapshotToRow(
  next: Record<string, boolean | string>,
  listPath: ItemListPath,
  rowIndex: number,
  snap: Record<string, boolean | string>
): void {
  for (const [k, v] of Object.entries(snap)) {
    const p = parseItemListFormKey(k);
    if (!p) continue;
    const tail = p.segments.slice(listPath.length + 1);
    const full = [...listPath, rowIndex, ...tail];
    next[JSON.stringify(["il", ...full])] = v;
  }
}

function deleteRowSubtree(
  next: Record<string, boolean | string>,
  listPath: ItemListPath,
  rowIndex: number
): void {
  for (const k of Object.keys(next)) {
    const p = parseItemListFormKey(k);
    if (p && belongsToRowAtListLevel(p.segments, listPath, rowIndex)) {
      delete next[k];
    }
  }
}

/**
 * Remove one item row: shift following rows up (including nested form keys).
 */
export function removeItemListRow(
  _listInput: TemplateStepInput & { type: "item_list" },
  listPath: ItemListPath,
  removedIndex: number,
  formValues: Record<string, boolean | string>
): Record<string, boolean | string> {
  const rowCount = getItemListRowCount(listPath, formValues);
  if (removedIndex < 0 || removedIndex >= rowCount) return { ...formValues };

  const next = { ...formValues };
  deleteRowSubtree(next, listPath, removedIndex);

  for (let r = removedIndex + 1; r < rowCount; r++) {
    const snap = snapshotRowAtList(next, listPath, r);
    deleteRowSubtree(next, listPath, r);
    applySnapshotToRow(next, listPath, r - 1, snap);
  }

  return setItemListRowCount(listPath, next, rowCount - 1);
}

/**
 * Reorder item-list rows (including nested keys) by moving `fromIndex` to `toIndex`.
 */
export function reorderItemListRows(
  listInput: TemplateStepInput & { type: "item_list" },
  listPath: ItemListPath,
  fromIndex: number,
  toIndex: number,
  formValues: Record<string, boolean | string>
): Record<string, boolean | string> {
  if (fromIndex === toIndex) return formValues;
  const rowCount = itemListRenderRowCount(listInput, listPath, formValues);
  if (fromIndex < 0 || fromIndex >= rowCount || toIndex < 0 || toIndex >= rowCount) {
    return formValues;
  }

  const snapshots: Record<string, boolean | string>[] = [];
  for (let r = 0; r < rowCount; r++) {
    snapshots.push(snapshotRowAtList(formValues, listPath, r));
  }

  const [moved] = snapshots.splice(fromIndex, 1);
  snapshots.splice(toIndex, 0, moved);

  const next = { ...formValues };
  for (let r = 0; r < rowCount; r++) {
    deleteRowSubtree(next, listPath, r);
  }
  for (let r = 0; r < rowCount; r++) {
    applySnapshotToRow(next, listPath, r, snapshots[r]!);
  }
  return next;
}

function serializeItemListAtPath(
  list: TemplateStepInput & { type: "item_list" },
  listPath: ItemListPath,
  formValues: Record<string, boolean | string>
): unknown[] {
  const subs = list.subInputs ?? [];
  const out: Record<string, unknown>[] = [];
  const rowCount = getItemListRowCount(listPath, formValues);

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
    if (itemListRowIsEmpty(list, listPath, rowIndex, formValues)) continue;
    const row: Record<string, unknown> = {};
    for (const sub of subs) {
      if (sub.readOnly) continue;
      if (sub.type === "item_list") {
        const nested = sub as TemplateStepInput & { type: "item_list" };
        row[sub.key] = serializeItemListAtPath(nested, [...listPath, rowIndex, sub.key], formValues);
        continue;
      }
      const fk = formKeyForItemListCell(listPath, rowIndex, sub.key);
      row[sub.key] = serializeInputValue(sub, fk in formValues ? formValues[fk] : undefined);
    }
    out.push(row);
  }
  return out;
}

/**
 * Payload merged into `process.context[stepKey]` from form state (scalar inputs + `item_list` arrays).
 * When `fileFieldValues` is omitted, file inputs are left out of the payload (caller should pass an
 * explicit map whenever the step defines file fields).
 */
export function buildInputStepContextPayload(
  inputs: TemplateStepInput[],
  formValues: Record<string, boolean | string>,
  fileFieldValues?: Record<string, ProcessFileRef | ProcessFileRef[] | null>
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  const itemLists = inputs.filter((i): i is TemplateStepInput & { type: "item_list" } => i.type === "item_list");
  const fileInputs = inputs.filter(
    (i) => i.type === "file-single" || i.type === "file-multiple"
  );
  const scalars = inputs.filter(
    (i) =>
      i.type !== "item_list" &&
      i.type !== "file-single" &&
      i.type !== "file-multiple" &&
      i.type !== "header"
  );

  for (const inp of scalars) {
    if (inp.readOnly) continue;
    if (!(inp.key in formValues)) continue;
    payload[inp.key] = serializeInputValue(inp, formValues[inp.key]);
  }
  if (fileFieldValues) {
    for (const inp of fileInputs) {
      if (inp.readOnly) continue;
      if (!(inp.key in fileFieldValues)) continue;
      const v = fileFieldValues[inp.key];
      if (inp.type === "file-single") {
        payload[inp.key] = v === null || v === undefined ? null : v;
      } else {
        payload[inp.key] = Array.isArray(v) ? v : [];
      }
    }
  }
  for (const list of itemLists) {
    if (list.readOnly) continue;
    payload[list.key] = serializeItemListAtPath(list, [list.key], formValues);
  }
  return payload;
}
