/**
 * Template `number` fields are stored as JSON strings (full precision) and surfaced
 * in memory as bigint (integer decimals) or string (fractional / non-integer text).
 */

export type NumericFieldValue = bigint | string;

const EMPTY_NUMERIC = "";

export function deserializeNumericFieldValue(value: unknown): NumericFieldValue {
  if (value === null || value === undefined) return EMPTY_NUMERIC;
  if (typeof value === "bigint") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return EMPTY_NUMERIC;
    if (Number.isInteger(value) && Number.isSafeInteger(value)) return BigInt(value);
    return String(value);
  }
  if (typeof value === "string") {
    const t = value.trim();
    if (t === "") return EMPTY_NUMERIC;
    if (/^-?\d+$/.test(t)) {
      try {
        return BigInt(t);
      } catch {
        return t;
      }
    }
    return t;
  }
  return String(value);
}

/** Display string for controlled inputs (always decimal text). */
export function numericFieldToFormString(value: NumericFieldValue): string {
  if (value === EMPTY_NUMERIC) return "";
  if (typeof value === "bigint") return value.toString();
  return value;
}

export type TemplateStepForNumeric = {
  key: string;
  inputs?: { key: string; type: string }[];
};

/**
 * Walk template steps and replace `number` input values in context with
 * {@link deserializeNumericFieldValue} results (bigint | string).
 */
export function deserializeProcessContextNumericFields(
  template: { steps: TemplateStepForNumeric[] },
  context: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...context };
  for (const step of template.steps) {
    const data = out[step.key];
    if (data === null || data === undefined || typeof data !== "object" || Array.isArray(data)) {
      continue;
    }
    const row = data as Record<string, unknown>;
    let clone: Record<string, unknown> | null = null;
    for (const inp of step.inputs ?? []) {
      if (inp.type !== "number" || !(inp.key in row)) continue;
      const deserialized = deserializeNumericFieldValue(row[inp.key]);
      if (clone === null) clone = { ...row };
      clone[inp.key] = deserialized;
    }
    if (clone !== null) out[step.key] = clone;
  }
  return out;
}

/** Attach deserialized numeric fields to a process payload from the API. */
export function withDeserializedNumericContext<T extends { template: { steps: TemplateStepForNumeric[] }; context: Record<string, unknown> }>(
  process: T
): T {
  return {
    ...process,
    context: deserializeProcessContextNumericFields(process.template, process.context),
  };
}

/** Value sent to API / stored — always trimmed decimal text (never IEEE number). */
export function serializeNumericFieldFromForm(raw: string): string {
  return raw.trim();
}

/**
 * UI filter: only optional leading `-`, digits, and at most one `.` (decimal templates).
 * Strips letters and other symbols so paste/typing cannot produce invalid numeric text.
 */
export function sanitizeNumericFormInput(raw: string): string {
  if (raw === "") return "";
  let start = 0;
  let out = "";
  if (raw[0] === "-") {
    out = "-";
    start = 1;
  }
  let dotSeen = false;
  for (let i = start; i < raw.length; i++) {
    const c = raw[i]!;
    if (c >= "0" && c <= "9") {
      out += c;
    } else if (c === "." && !dotSeen) {
      out += c;
      dotSeen = true;
    }
  }
  return out;
}
