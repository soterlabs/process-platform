import type { Process } from "@/entities/process";
import type { Template } from "@/entities/template";
import type { RequestTemplateStep } from "@/entities/template";
import { storageService } from "@/services/storage-service";
import { agentService } from "@/services/agent-service";
import {
  getStepByKey,
  getNextStepKey,
  getFirstStepKey,
} from "@/services/template-helpers";

function isRequestAgentStep(
  step: { type: string; requestType?: string }
): step is RequestTemplateStep {
  return step.type === "request" && step.requestType === "agent";
}

/**
 * Resolves the initial step, skipping through leading conditions.
 */
function getInitialStepKey(
  template: Template,
  context: Record<string, unknown>
): string | null {
  let currentKey = getFirstStepKey(template);
  const visited = new Set<string>();
  while (currentKey) {
    if (visited.has(currentKey)) return currentKey;
    visited.add(currentKey);
    const step = getStepByKey(template, currentKey);
    if (!step || step.type !== "condition") return currentKey;
    currentKey = getNextStepKey(template, currentKey, context);
  }
  return null;
}

export type ExecutionService = {
  startProcess(templateKey: string): Promise<{ processId: string; currentStepKey: string | null }>;
  getProcessState(processId: string): Promise<Process | null>;
  updateStepState(
    processId: string,
    stepKey: string,
    payload: Record<string, unknown>
  ): Promise<{ ok: true }>;
  completeStepAndAdvance(
    processId: string,
    stepKey: string,
    payload: Record<string, unknown>
  ): Promise<{ nextStepKey: string | null }>;
};

export const executionService: ExecutionService = {
  async startProcess(templateKey) {
    const template = await storageService.getTemplate(templateKey);
    if (!template) throw new Error(`Template not found: ${templateKey}`);
    const processId = `proc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const context: Record<string, unknown> = {};
    const result: Record<string, unknown> = {};
    const currentStepKey = getInitialStepKey(template, context);
    const now = new Date().toISOString();
    await storageService.saveProcessState({
      processId,
      template,
      status: "running",
      currentStepKey,
      context,
      result,
      startedAt: now,
      updatedAt: now,
    });
    return { processId, currentStepKey };
  },

  async getProcessState(processId) {
    return storageService.getProcessState(processId);
  },

  async updateStepState(processId, stepKey, payload) {
    const state = await storageService.getProcessState(processId);
    if (!state) throw new Error(`Process not found: ${processId}`);

    const step = getStepByKey(state.template, stepKey);
    if (!step) throw new Error(`Step not found: ${stepKey}`);

    const existing = (state.context[stepKey] as Record<string, unknown>) ?? {};
    const merged = { ...existing, ...payload };

    await storageService.saveProcessState({
      ...state,
      context: { ...state.context, [stepKey]: merged },
      updatedAt: new Date().toISOString(),
    });
    return { ok: true as const };
  },

  async completeStepAndAdvance(processId, stepKey, payload) {
    const state = await storageService.getProcessState(processId);
    if (!state) throw new Error(`Process not found: ${processId}`);

    const step = getStepByKey(state.template, stepKey);
    if (!step) throw new Error(`Step not found: ${stepKey}`);

    if (state.currentStepKey !== stepKey) {
      throw new Error(`Current step is ${state.currentStepKey ?? "none"}, not ${stepKey}`);
    }

    const existing = (state.context[stepKey] as Record<string, unknown>) ?? {};
    const merged = { ...existing, ...payload };
    const newContext = { ...state.context, [stepKey]: merged };

    const nextStepKey = getNextStepKey(state.template, stepKey, newContext);

    if (nextStepKey === null) {
      await storageService.saveProcessState({
        ...state,
        context: newContext,
        status: "completed",
        currentStepKey: null,
        updatedAt: new Date().toISOString(),
      });
      return { nextStepKey: null };
    }

    await storageService.saveProcessState({
      ...state,
      context: newContext,
      status: "running",
      currentStepKey: nextStepKey,
      updatedAt: new Date().toISOString(),
    });

    const nextStep = getStepByKey(state.template, nextStepKey);
    if (nextStep && isRequestAgentStep(nextStep)) {
      // Run request/agent steps in the background so the client can show step 2 and poll
      void runRequestStepsAsync(processId).catch((err) =>
        console.error("[runRequestStepsAsync]", err)
      );
    }

    return { nextStepKey };
  },
};

async function runRequestStepsAsync(processId: string): Promise<void> {
  let state = await storageService.getProcessState(processId);
  if (!state) return;

  let currentKey = state.currentStepKey;
  let context = { ...state.context };
  let result = { ...state.result };

  while (currentKey) {
    const step = getStepByKey(state.template, currentKey);
    if (!step || !isRequestAgentStep(step)) break;

    const systemPrompt = step.prompt ?? "Use the provided context to respond.";
    const response = await agentService.runAgent({
      systemPrompt,
      context,
    });
    context = { ...context, [currentKey]: { response } };
    if (step.result) {
      result = { ...result, [currentKey]: response };
    }

    const followingKey = getNextStepKey(state.template, currentKey, context);
    if (followingKey === null) {
      await storageService.saveProcessState({
        ...state,
        context,
        result,
        status: "completed",
        currentStepKey: null,
        updatedAt: new Date().toISOString(),
      });
      return;
    }

    await storageService.saveProcessState({
      ...state,
      context,
      result,
      status: "running",
      currentStepKey: followingKey,
      updatedAt: new Date().toISOString(),
    });
    state = await storageService.getProcessState(processId);
    if (!state) return;
    currentKey = followingKey;
  }
}
