import type { Process } from "@/entities/process";
import type { InputTemplateStep } from "@/entities/template";
import { expressionEvaluateOptionsFromProcess } from "@/lib/expression-process-context";
import { deserializeProcessContextNumericFields } from "@/lib/numeric-field";
import { evaluate } from "@/services/expression-service";
import { getCurrentProcessStep, getProcessStepById, getStepByKey } from "@/services/template-helpers";
import { storageService } from "@/services/storage";
import type { IAuthorizationService } from "./interface";

function userHasPermission(permissions: string[], permission: string): boolean {
  if (!permissions?.length || !permission) return false;
  const lower = permission.toLowerCase();
  return permissions.some((p) => p.toLowerCase() === lower);
}

function canUserActOnStep(
  userPermissions: string[],
  requiredPermissions: string[] | undefined
): boolean {
  if (!requiredPermissions || requiredPermissions.length === 0) return true;
  const allowedSet = new Set(requiredPermissions.map((r) => r.toLowerCase()));
  return userPermissions.some((p) => allowedSet.has(p.toLowerCase()));
}

async function checkStepAuth(
  processId: string,
  stepId: string,
  userId: string | null,
  permissions: string[],
  options?: {
    intent?: "update" | "complete";
    mergeStepContextPayload?: Record<string, unknown>;
  }
): Promise<{ authorized: boolean; status?: number; body?: unknown }> {
  if (!userId) {
    return { authorized: false, status: 401, body: { error: "Missing user id" } };
  }
  const process = await storageService.getProcessState(processId);
  if (!process) {
    return { authorized: false, status: 404, body: { error: "Process not found" } };
  }
  const processStep = getProcessStepById(process.steps, stepId);
  if (!processStep) {
    return { authorized: false, status: 404, body: { error: "Step not found" } };
  }
  const templateStep = getStepByKey(process.template, processStep.stepKey);
  if (!templateStep) {
    return { authorized: false, status: 404, body: { error: "Template step not found" } };
  }
  const requiredPermissions =
    templateStep.type === "input"
      ? (templateStep as InputTemplateStep).permissions
      : undefined;
  const allowed = canUserActOnStep(permissions, requiredPermissions);
  if (!allowed) {
    return { authorized: false, status: 403, body: { error: "Not authorized to act on this step" } };
  }

  const intent = options?.intent ?? "update";
  if (
    intent === "complete" &&
    templateStep.type === "input"
  ) {
    const inputStep = templateStep as InputTemplateStep;
    const completeExpr = inputStep.completeExpression?.trim();
    if (completeExpr) {
      const stepKey = processStep.stepKey;
      const mergedContext: Record<string, unknown> = { ...process.context };
      const existing = (mergedContext[stepKey] as Record<string, unknown>) ?? {};
      mergedContext[stepKey] = {
        ...existing,
        ...(options?.mergeStepContextPayload ?? {}),
      };
      const evalCtx = deserializeProcessContextNumericFields(
        process.template,
        mergedContext
      );
      const ok = evaluate(evalCtx, completeExpr, {
        userPermissions: permissions,
        ...expressionEvaluateOptionsFromProcess(process),
      });
      if (!Boolean(ok)) {
        return {
          authorized: false,
          status: 403,
          body: {
            error:
              "Step completion is not allowed for your account, or the submitted data does not satisfy the completion rule for this step.",
          },
        };
      }
    }
  }

  return { authorized: true };
}

function canUserActOnCurrentStep(
  process: Process,
  userId: string | null,
  permissions: string[]
): boolean {
  if (!userId) return false;
  if (process.status !== "running") return false;
  const currentStep = getCurrentProcessStep(process.steps);
  if (!currentStep) return false;
  const templateStep = getStepByKey(process.template, currentStep.stepKey);
  if (!templateStep || templateStep.type !== "input") return false;
  return canUserActOnStep(permissions, (templateStep as InputTemplateStep).permissions);
}

function canCompleteCurrentStep(
  process: Process,
  userId: string | null,
  permissions: string[]
): boolean {
  if (!canUserActOnCurrentStep(process, userId, permissions)) return false;
  const currentStep = getCurrentProcessStep(process.steps);
  if (!currentStep) return false;
  const templateStep = getStepByKey(process.template, currentStep.stepKey);
  if (!templateStep || templateStep.type !== "input") return false;
  const inputStep = templateStep as InputTemplateStep;
  const completeExpr = inputStep.completeExpression?.trim();
  if (!completeExpr) return true;
  const evalCtx = deserializeProcessContextNumericFields(process.template, process.context);
  return Boolean(
    evaluate(evalCtx, completeExpr, {
      userPermissions: permissions,
      ...expressionEvaluateOptionsFromProcess(process),
    })
  );
}

export const authorizationService: IAuthorizationService = {
  userHasPermission,
  canUserActOnStep,
  checkStepAuth,
  canUserActOnCurrentStep,
  canCompleteCurrentStep,
};
