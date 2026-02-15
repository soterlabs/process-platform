import type { TemplateStep } from "./template-step";

export type ConditionTemplateStep = TemplateStep & {
  type: "condition";
  expression?: string;
  thenStepKey?: string;
  elseStepKey?: string;
};