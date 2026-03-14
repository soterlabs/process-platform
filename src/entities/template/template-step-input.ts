export type TemplateStepInput = {
  key: string;
  type: "bool" | "string" | "string-multiline" | "number" | "datetime" | "dropdown";
  title: string;
  visibleExpression?: string;
  values?: string[];
  /** When true, displayed as read-only text (resolved from defaultValue). Use for view controls. */
  readOnly?: boolean;
  /** For readOnly: template with ${path} (context) and {{ expression }} (JavaScript). For editable: initial value (same syntax). */
  defaultValue?: string;
};