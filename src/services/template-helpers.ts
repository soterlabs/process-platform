import type { Template, TemplateStep, ConditionTemplateStep } from "@/entities/template";

export function getStepByKey(template: Template, stepKey: string): TemplateStep | null {
  const step = template.steps.find((s) => s.key === stepKey);
  return step ?? null;
}

export function getFirstStepKey(template: Template): string | null {
  return template.firstStepKey ?? null;
}

export function getStepIndex(template: Template, stepKey: string): number {
  const i = template.steps.findIndex((s) => s.key === stepKey);
  return i >= 0 ? i : -1;
}

function getByPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.replace(/^context\.?/, "").split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function resolveNextForKey(
  template: Template,
  stepKey: string,
  context: Record<string, unknown>
): string | null {
  const step = getStepByKey(template, stepKey);
  if (!step) return null;

  let nextKey: string | null = null;
  if (step.type === "condition") {
    const cond = step as ConditionTemplateStep;
    if (cond.expression) {
      const value = getByPath(context, cond.expression);
      if (value && cond.thenStepKey && template.steps.some((s) => s.key === cond.thenStepKey)) {
        nextKey = cond.thenStepKey;
      } else if (cond.elseStepKey && template.steps.some((s) => s.key === cond.elseStepKey)) {
        nextKey = cond.elseStepKey;
      }
    }
    if (nextKey === null && cond.nextStepKey && template.steps.some((s) => s.key === cond.nextStepKey)) {
      nextKey = cond.nextStepKey;
    }
  } else {
    nextKey = step.nextStepKey && template.steps.some((s) => s.key === step.nextStepKey) ? step.nextStepKey : null;
  }
  return nextKey;
}

/**
 * Returns the next step key after completing the given step.
 * Uses step.nextStepKey; for conditions, resolves thenStepKey/elseStepKey from expression.
 * Skips through chained conditions until a concrete step is reached.
 */
export function getNextStepKey(
  template: Template,
  fromStepKey: string,
  context: Record<string, unknown>
): string | null {
  const visited = new Set<string>();
  let currentKey: string | null = resolveNextForKey(template, fromStepKey, context);
  while (currentKey) {
    if (visited.has(currentKey)) break;
    visited.add(currentKey);
    const step = getStepByKey(template, currentKey);
    if (!step || step.type !== "condition") return currentKey;
    currentKey = resolveNextForKey(template, currentKey, context);
  }
  return null;
}
