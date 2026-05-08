import type { TemplateStep } from "./template-step";

/**
 * Script step: arbitrary async JavaScript (trusted template code).
 * The runner wraps `source` as `async (context) => { ... }` where `context` is `process.context`.
 * Return a plain object; its enumerable keys are merged into `context.<stepKey>`.
 */
export type ScriptTemplateStep = TemplateStep & {
  type: "script";
  /** Async function body only (not the `async (context) =>` wrapper). Use `context` to read prior steps. */
  source?: string;
};
