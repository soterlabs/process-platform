export type TemplateStepInput = {
  key: string;
  /**
   * `number`: stored as a JSON number (IEEE double). Use `decimal_string` when you need exact
   * decimal text without floating-point rounding.
   *
   * `file-single` / `file-multiple`: context stores only `ProcessFileRef`-shaped metadata; file bytes
   * are stored separately keyed by process id.
   *
   * `item_list`: repeating rows (each row is an object in `context[stepKey][key]`). Every row
   * includes a string at the fixed key `value` (the list line, e.g. URL); `subInputs` are extra
   * fields — a sub may be another `item_list` (stored as a nested array of row objects). Do not
   * use sub key `value`. Rows are contiguous; serialization stops at the first fully empty row;
   * the UI shows one extra empty row to add the next item.
   *
   * `header`: display-only section heading; optional `defaultValue` is subtitle HTML. Not stored
   * in process context. Use `headerLevel` for main sections vs subsections.
   */
  type:
    | "bool"
    | "string"
    | "string-multiline"
    | "number"
    | "decimal_string"
    | "datetime"
    | "dropdown"
    | "file-single"
    | "file-multiple"
    | "item_list"
    | "header";
  title: string;
  /** When `type === "header"`: `section` (default) or `subsection`. */
  headerLevel?: "section" | "subsection";
  visibleExpression?: string;
  values?: string[];
  /** When true, displayed as read-only text (resolved from defaultValue). Use for view controls. */
  readOnly?: boolean;
  /** For readOnly: template with ${path} and {{ expression }}. For editable: initial value (same syntax). */
  defaultValue?: string;
  /** When `type === "item_list"`: extra fields per row. Nested `item_list` is allowed; never use key `value`. */
  subInputs?: TemplateStepInput[];
};
