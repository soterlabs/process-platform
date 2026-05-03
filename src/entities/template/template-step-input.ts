export type TemplateStepInput = {
  key: string;
  /**
   * `number`: stored as a JSON number (IEEE double). Use `decimal_string` when you need exact
   * decimal text without floating-point rounding.
   *
   * `item_list`: repeating rows of `subInputs` (each row is an object in `context[stepKey][key]`).
   * Rows are contiguous from index 0; serialization stops at the first fully empty row. The UI
   * always shows one extra empty row so you can add the next item.
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
  /** Required when `type === "item_list"`: fields per row (must not be `item_list`). */
  subInputs?: TemplateStepInput[];
};
