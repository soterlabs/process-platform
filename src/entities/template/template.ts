import { ConditionTemplateStep } from "./condititon-template-step";
import { InputTemplateStep } from "./input-template-step";
import { RequestTemplateStep } from "./request-template-step";

export type Template = {
  key: string;
  name?: string;
  firstStepKey: string;
  steps: (InputTemplateStep | ConditionTemplateStep | RequestTemplateStep)[];
};