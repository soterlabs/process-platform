export type TemplateStepInput = {
  key: string;
  /**
   * `number`: stored as a JSON number (IEEE double). Use `decimal_string` when you need exact
   * decimal text without floating-point rounding.
   *
   * `item_list`: repeating rows (each row is an object in `context[stepKey][key]`). Every row
   * includes a string at the fixed key `value` (the list line, e.g. URL); `subInputs` are extra
   * fields only — do not use sub key `value`. Rows are contiguous; serialization stops at the
   * first fully empty row; the UI shows one extra empty row to add the next item.
   */
  type:
    | "bool"
    | "string"
    | "string-multiline"
    | "number"
    | "decimal_string"
    | "datetime"
    | "dropdown"
    | "item_list";
  title: string;
  visibleExpression?: string;
  values?: string[];
  /** When true, displayed as read-only text (resolved from defaultValue). Use for view controls. */
  readOnly?: boolean;
  /** For readOnly: template with ${path} and {{ expression }}. For editable: initial value (same syntax). */
  defaultValue?: string;
  /** When `type === "item_list"`: extra fields per row (must not be `item_list`; never use key `value`). */
  subInputs?: TemplateStepInput[];
};
