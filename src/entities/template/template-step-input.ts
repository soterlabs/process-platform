export type TemplateStepInput = {
  key: string;
  type: "bool" | "string" | "number" | "dropdown";
  title: string;
  visibleExpression?: string;
  values?: string[];
};