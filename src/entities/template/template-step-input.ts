export type TemplateStepInput = {
  key: string;
  /**
   * `number`: stored as a JSON number (IEEE double). Use `decimal_string` when you need exact
   * decimal text without floating-point rounding.
   *
   * `item_list`: repeating sub-fields — one row per non-empty line of the `string-multiline` input
   * named by `linesFromKey`. Stored as `context[stepKey][key]` = array of row objects.
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
  /** Required when `type === "item_list"`: key of another input with type `string-multiline`. */
  linesFromKey?: string;
  /** Required when `type === "item_list"`: fields per line (must not be `item_list`). */
  subInputs?: TemplateStepInput[];
};
