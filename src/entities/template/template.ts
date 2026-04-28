import { AutomaticTemplateStep } from "./automatic-template-step";
import { ConditionTemplateStep } from "./condititon-template-step";
import { InputTemplateStep } from "./input-template-step";
import { RequestTemplateStep } from "./request-template-step";
import { SlackNotifyTemplateStep } from "./slack-notify-template-step";
import type { TemplateStepViewControl } from "./template-step-view-control";

export type TemplateStatus = "active" | "draft" | "archived";

export type Template = {
  key: string;
  name?: string;
  description?: string;
  status?: TemplateStatus;
  firstStepKey: string;
  steps: (
    | InputTemplateStep
    | ConditionTemplateStep
    | RequestTemplateStep
    | AutomaticTemplateStep
    | SlackNotifyTemplateStep
  )[];
  permissions: string[];
  resultViewControls?: TemplateStepViewControl[];
  updatedAt?: string;
};