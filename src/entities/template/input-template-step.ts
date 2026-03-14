import { TemplateStep } from "./template-step";
import { TemplateStepInput } from "./template-step-input";

export type InputTemplateStep = TemplateStep & {
  type: "input";
  /** Ordered list: editable inputs and read-only view controls (readOnly + defaultValue). */
  inputs: TemplateStepInput[];
  allowedRoles: string[];
};