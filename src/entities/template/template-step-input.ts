export type TemplateStepInput = {
  key: string;
  /**
   * `number`: stored as a JSON number (IEEE double). Use `decimal_string` when you need exact
   * decimal text without floating-point rounding.
   *
   * `file-single` / `file-multiple`: context stores only `ProcessFileRef`-shaped metadata; file bytes
   * are stored separately keyed by process id.
   *
   * `item_list`: repeating rows (each row is an object in `context[stepKey][key]` with only
   * `subInputs` keys). A sub may be another `item_list` (nested array of row objects). The UI
   * uses an explicit row count: users add rows with a button and remove rows with a control per row.
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
  /**
   * When `type` is `string`, `string-multiline`, `number`, or `decimal_string`: optional input placeholder.
   */
  placeholder?: string;
  /** When `type === "item_list"`: fields per row. Nested `item_list` is allowed. */
  subInputs?: TemplateStepInput[];
};
