import type { ProcessStep } from "@/entities/process";
import type {
  Template,
  TemplateStep,
  ConditionTemplateStep,
} from "@/entities/template";
import { evaluate } from "@/services/expression-service";

export function getCurrentProcessStep(
  steps: ProcessStep[]
): ProcessStep | null {
  return steps.length > 0 ? steps[steps.length - 1] : null;
}

export function getProcessStepById(
  steps: ProcessStep[],
  stepId: string
): ProcessStep | null {
  return steps.find((s) => s.id === stepId) ?? null;
}

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

export function getNextStepKey(
  template: Template,
  fromStepKey: string,
  context: Record<string, unknown>
): string | null {
  const step = getStepByKey(template, fromStepKey);
  if (!step) return null;

  let nextKey: string | null = null;
  if (step.type === "condition") {
    const cond = step as ConditionTemplateStep;
    if (cond.expression) {
      const value = evaluate(context, cond.expression);
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
