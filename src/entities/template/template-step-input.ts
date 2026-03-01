export type TemplateStepInput = {
  key: string;
  type: "bool" | "string" | "dropdown";
  title: string;
  visibleExpression?: string;
  values?: string[];
};