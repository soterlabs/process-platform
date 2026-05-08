import type { Template } from "@/entities/template";

/** Script steps run arbitrary `source` via AsyncFunction; they must not be accepted from the HTTP template API. */
export function templateHasScriptStep(template: Template): boolean {
  return template.steps.some((s) => s.type === "script");
}

export const TEMPLATE_API_SCRIPT_STEP_MESSAGE =
  "Templates with a script step cannot be created or updated via the API. Define script steps only in trusted repository code (e.g. under src/templates/).";
