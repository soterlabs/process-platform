import type { TemplateStep } from "./template-step";

export type AutomaticTemplateStep = TemplateStep & {
  type: "automatic";
  contextKey: string;
  expression: string;
};
