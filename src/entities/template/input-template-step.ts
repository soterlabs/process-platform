import { TemplateStep } from "./template-step";
import { TemplateStepInput } from "./template-step-input";

export type InputTemplateStep = TemplateStep & {
  type: "input";
  inputs: TemplateStepInput[];
  permissions: string[];
};