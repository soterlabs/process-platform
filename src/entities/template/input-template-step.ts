import { TemplateStep } from "./template-step";
import { TemplateStepInput } from "./template-step-input";

export type InputTemplateStep = TemplateStep & {
  type: "input";
  inputs: TemplateStepInput[];
  permissions: string[];
  /**
   * When set, Continue/Finish is shown and API completion is allowed only if this
   * expression is truthy. Same scope as other template expressions, plus `hasPermission("name")`.
   * Step `permissions` still gate who may edit the step; this gates completion only.
   */
  completeExpression?: string;
};
