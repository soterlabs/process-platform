import type { Process } from "@/entities/process";
import type { InputTemplateStep } from "@/entities/template";
import { getCurrentProcessStep, getProcessStepById, getStepByKey } from "@/services/template-helpers";
import { storageService } from "@/services/storage-service";

/**
 * Returns true if the user is allowed to act on a step with the given allowedRoles.
 * The user must belong to at least one group that has at least one role in allowedRoles.
 * If allowedRoles is missing or empty, allows (no restriction).
 */
export async function canUserActOnStep(
  userId: string,
  allowedRoles: string[] | undefined
): Promise<boolean> {
  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }
  const memberships = await storageService.listGroupMemberships();
  const userMemberships = memberships.filter((m) => m.userId === userId);
  const allowedSet = new Set(allowedRoles);
  for (const m of userMemberships) {
    const group = await storageService.getGroup(m.groupId);
    if (!group) continue;
    for (const role of group.roles) {
      if (allowedSet.has(role)) return true;
    }
  }
  return false;
}

/**
 * Resolves process, step, and template step then checks if the user may act on the step.
 * Use from API layer before update/complete. Returns 401 if no user id, 404 if not found, 403 if not allowed.
 */
export async function checkStepAuth(
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

/**
 * Returns whether the user can act on the current step of the process (e.g. submit input / complete).
 * Used by GET process to signal the UI. Only input steps are user-actionable; for those we check allowedRoles.
 */
export async function canUserActOnCurrentStep(
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
