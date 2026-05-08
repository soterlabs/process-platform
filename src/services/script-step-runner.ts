import type { ScriptTemplateStep } from "@/entities/template";
import type { EvaluateExpressionOptions } from "@/services/expression-service";

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (
  ...args: string[]
) => (ctx: Record<string, unknown>) => Promise<unknown>;

/**
 * Runs `step.source` as an async function body with `context` = process.context.
 * Return value: plain object merged into this step's context; non-objects wrapped as `{ value }`.
 * On throw or empty source, returns `{ error: string }` (still merged).
 */
export async function runScriptTemplateStep(
  step: ScriptTemplateStep,
  processContext: Record<string, unknown>,
  _exprOpts?: EvaluateExpressionOptions
): Promise<Record<string, unknown>> {
  const body = (step.source ?? "").trim();
  if (!body) {
    return { error: "empty script source" };
  }
  try {
    const fn = new AsyncFunction("context", body) as (ctx: Record<string, unknown>) => Promise<unknown>;
    const out = await fn(processContext);
    if (out === null || out === undefined) {
      return {};
    }
    if (typeof out !== "object" || Array.isArray(out)) {
      return { value: out };
    }
    return { ...(out as Record<string, unknown>) };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: msg };
  }
}
