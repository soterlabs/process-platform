import type { Process } from "@/entities/process";
import type { InputTemplateStep } from "@/entities/template";
import { getCurrentProcessStep, getProcessStepById, getStepByKey } from "@/services/template-helpers";
import { storageService } from "@/services/storage";
import type { IAuthorizationService } from "./interface";

async function getUserRoles(userId: string): Promise<string[]> {
  const memberships = await storageService.listGroupMemberships();
  const userMemberships = memberships.filter((m) => m.userId === userId);
  const roleSet = new Set<string>();
  for (const m of userMemberships) {
    const group = await storageService.getGroup(m.groupId);
    if (!group) continue;
    for (const r of group.roles) roleSet.add(r);
  }
  return Array.from(roleSet);
}

async function userHasRole(userId: string, role: string): Promise<boolean> {
  const roles = await getUserRoles(userId);
  return roles.some((r) => r.toLowerCase() === role.toLowerCase());
}

async function canUserActOnStep(
  userId: string,
  allowedRoles: string[] | undefined
): Promise<boolean> {
  if (!allowedRoles || allowedRoles.length === 0) return true;
  const memberships = await storageService.listGroupMemberships();
  const userMemberships = memberships.filter((m) => m.userId === userId);
  const allowedSet = new Set(allowedRoles.map((r) => r.toLowerCase()));
  for (const m of userMemberships) {
    const group = await storageService.getGroup(m.groupId);
    if (!group) continue;
    for (const role of group.roles) {
      if (allowedSet.has(role.toLowerCase())) return true;
    }
  }
  return false;
}

async function checkStepAuth(
  processId: string,
  stepId: string,
  userId: string | null
): Promise<{ authorized: boolean; status?: number; body?: unknown }> {
  if (!userId) {
    return { authorized: false, status: 401, body: { error: "Missing x-user-id header" } };
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
  const allowedRoles =
    templateStep.type === "input"
      ? (templateStep as InputTemplateStep).allowedRoles
      : undefined;
  const allowed = await canUserActOnStep(userId, allowedRoles);
  if (!allowed) {
    return { authorized: false, status: 403, body: { error: "Not authorized to act on this step" } };
  }
  return { authorized: true };
}

async function canUserActOnCurrentStep(
  process: Process,
  userId: string | null
): Promise<boolean> {
  if (!userId) return false;
  if (process.status !== "running") return false;
  const currentStep = getCurrentProcessStep(process.steps);
  if (!currentStep) return false;
  const templateStep = getStepByKey(process.template, currentStep.stepKey);
  if (!templateStep || templateStep.type !== "input") return false;
  return canUserActOnStep(userId, (templateStep as InputTemplateStep).allowedRoles);
}

export const authorizationService: IAuthorizationService = {
  getUserRoles,
  userHasRole,
  canUserActOnStep,
  checkStepAuth,
  canUserActOnCurrentStep,
};
