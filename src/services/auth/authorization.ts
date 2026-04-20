import type { Process } from "@/entities/process";
import type { InputTemplateStep } from "@/entities/template";
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
  permissions: string[]
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

export const authorizationService: IAuthorizationService = {
  userHasPermission,
  canUserActOnStep,
  checkStepAuth,
  canUserActOnCurrentStep,
};
