import { AutomaticTemplateStep } from "./automatic-template-step";
import { ConditionTemplateStep } from "./condititon-template-step";
import { InputTemplateStep } from "./input-template-step";
import { RequestTemplateStep } from "./request-template-step";
import type { TemplateStepViewControl } from "./template-step-view-control";

export type Template = {
  key: string;
  name?: string;
  firstStepKey: string;
  steps: (InputTemplateStep | ConditionTemplateStep | RequestTemplateStep | AutomaticTemplateStep)[];
  allowedRoles: string[];
  resultViewControls?: TemplateStepViewControl[];
  updatedAt?: string;
};