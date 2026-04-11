export type TemplateStepInput = {
  key: string;
  /**
   * `number`: stored as a JSON string (full precision); loaded in the app as `bigint` for integer
   * decimals or `string` for fractional/non-integer text (see `@/lib/numeric-field`).
   */
  type: "bool" | "string" | "string-multiline" | "number" | "datetime" | "dropdown";
  title: string;
  visibleExpression?: string;
  values?: string[];
  /** When true, displayed as read-only text (resolved from defaultValue). Use for view controls. */
  readOnly?: boolean;
  /** For readOnly: template with ${path} (context) and {{ expression }} (JavaScript: step keys, keccak256, generatePayload, Date/Math/JSON). For editable: initial value (same syntax). */
  defaultValue?: string;
};