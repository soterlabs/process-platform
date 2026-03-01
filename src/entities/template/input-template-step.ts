import { TemplateStep } from "./template-step";
import { TemplateStepInput } from "./template-step-input";
import { TemplateStepViewControl } from "./template-step-view-control";

export type InputTemplateStep = TemplateStep & {
  type: "input";
  inputs: TemplateStepInput[];
  viewControls?: TemplateStepViewControl[];
  allowedRoles: string[];
};