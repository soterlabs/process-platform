import { AutomaticTemplateStep } from "./automatic-template-step";
import { ConditionTemplateStep } from "./condititon-template-step";
import { InputTemplateStep } from "./input-template-step";
import { RequestTemplateStep } from "./request-template-step";
import type { TemplateStepViewControl } from "./template-step-view-control";

export type TemplateStatus = "active" | "draft" | "archived";

export type Template = {
  key: string;
  name?: string;
  /** Optional marketing-style blurb for list cards; generated in UI if omitted. */
  description?: string;
  /** Optional state for filters and badges; treated as active when omitted. */
  status?: TemplateStatus;
  firstStepKey: string;
  steps: (InputTemplateStep | ConditionTemplateStep | RequestTemplateStep | AutomaticTemplateStep)[];
  allowedRoles: string[];
  resultViewControls?: TemplateStepViewControl[];
  updatedAt?: string;
};