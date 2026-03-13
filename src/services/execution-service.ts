import { randomUUID } from "crypto";
import type { Process } from "@/entities/process";
import type {
  AutomaticTemplateStep,
  ConditionTemplateStep,
  RequestTemplateStep,
} from "@/entities/template";
import { agentService } from "@/services/agent-service";
import { evaluate } from "@/services/expression-service";
import {
  getCurrentProcessStep,
  getNextStepKey,
  getProcessStepById,
  getStepByKey,
} from "@/services/template-helpers";
import { storageService } from "@/services/storage-service";

function pushStep(process: Process, stepKey: string): void {
  process.steps.push({
    id: randomUUID(),
    processId: process.processId,
    stepKey,
  });
}

function runAutomaticStep(
  step: AutomaticTemplateStep,
  context: Record<string, unknown>
): Record<string, unknown> {
  const value = evaluate(context, step.expression);
  return { ...context, [step.contextKey]: value };
}

function runConditionalStep(
  step: ConditionTemplateStep,
  context: Record<string, unknown>
): string | null {
  const value = evaluate(context, step.expression);
  if (value) return step.thenStepKey;
  else return step.elseStepKey;
}

export const executionService = {
  async getProcessState(processId: string): Promise<Process | null> {
    return storageService.getProcessState(processId);
  },

  async startProcess(templateKey: string): Promise<Process> {
    const template = await storageService.getTemplate(templateKey);
    if (!template) {
      throw new Error(`Template not found: ${templateKey}`);
    }
    const now = new Date().toISOString();
    const processId = randomUUID();
    const process: Process = {
      processId,
      template,
      status: "running",
      steps: [],
      context: {},
      result: {},
      startedAt: now,
      updatedAt: now,
    };

    pushStep(process, template.firstStepKey);
    await storageService.saveProcessState(process);
    return process;
  },

  async completeProcess(process: Process): Promise<void> {
    if (process.status !== "running") {
      throw new Error(`Process is not running: ${process.status}`);
    }
  
    process.status = "completed";
    await storageService.saveProcessState(process);
  },
  
  async completeProcessById(processId: string): Promise<Process> {
    const process = await storageService.getProcessState(processId);
    if (!process) throw new Error(`Process not found: ${processId}`);
    await this.completeProcess(process);

    return process;
  },

  /**
   * Updates the context for a step. Context is keyed by template step key (not step id).
   * Each key in payload overwrites the existing value for that key in the step's context.
   */
  async updateStep(
    process: Process,
    stepId: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    if (process.status !== "running") {
      throw new Error(`Process is not running: ${process.status}`);
    }
    const step = getProcessStepById(process.steps, stepId);
    if (!step) throw new Error(`Step not found: ${stepId}`);
    const stepKey = step.stepKey;
    const existing = (process.context[stepKey] as Record<string, unknown>) ?? {};
    process.context[stepKey] = { ...existing, ...payload };
    await storageService.saveProcessState(process);
  },

  async updateStepById(
    processId: string,
    stepId: string,
    payload: Record<string, unknown>
  ): Promise<Process> {
    const process = await storageService.getProcessState(processId);
    if (!process) throw new Error(`Process not found: ${processId}`);
    await this.updateStep(process, stepId, payload);
    return process;
  },

  async completeStep(
    process: Process,
    stepId: string,
    updatedById?: string
  ): Promise<string | null> {
    if (process.status !== "running") {
      throw new Error(`Process is not running: ${process.status}`);
    }
    const step = getProcessStepById(process.steps, stepId);
    if (!step) throw new Error(`Step not found: ${stepId}`);
    step.updatedUTC = new Date().toISOString();
    if (updatedById !== undefined) step.updatedById = updatedById;
    let nextStepKey = getNextStepKey(process.template, step.stepKey, process.context);
    if (nextStepKey === null) {
      await this.completeProcess(process);
      return nextStepKey;
    }
    pushStep(process, nextStepKey);
    await storageService.saveProcessState(process);
    return nextStepKey;
  },

  async completeStepById(
    processId: string,
    stepId: string,
    updatedById?: string
  ): Promise<{ process: Process; nextStepKey: string | null }> {
    const process = await storageService.getProcessState(processId);
    if (!process) throw new Error(`Process not found: ${processId}`);
    const nextStepKey = await this.completeStep(process, stepId, updatedById);
    return { process, nextStepKey };
  },

  async executeStep(process: Process): Promise<void> {
    if (process.status !== "running") {
      throw new Error(`Process is not running: ${process.status}`);
    }

    const currentStep = getCurrentProcessStep(process.steps);
    if (!currentStep) return;

    const templateStep = getStepByKey(process.template, currentStep.stepKey);
    if (!templateStep) return;

    currentStep.updatedUTC = new Date().toISOString();

    if (templateStep.type === "automatic") {
      const newContext = runAutomaticStep(
        templateStep as AutomaticTemplateStep,
        process.context
      );
      const contextKey = (templateStep as AutomaticTemplateStep).contextKey;
      const value = newContext[contextKey];
      const stepKey = currentStep.stepKey;
      const existing = (process.context[stepKey] as Record<string, unknown>) ?? {};
      process.context[stepKey] = { ...existing, [contextKey]: value };
      const nextStepKey = templateStep.nextStepKey;
      if (nextStepKey && getStepByKey(process.template, nextStepKey)) {
        pushStep(process, nextStepKey);
      } else {
        await this.completeProcess(process);
      }
      await storageService.saveProcessState(process);
      return;
    }

    if (templateStep.type === "condition") {
      const nextKey = runConditionalStep(
        templateStep as ConditionTemplateStep,
        process.context
      );
      if (nextKey && getStepByKey(process.template, nextKey)) {
        pushStep(process, nextKey);
        await storageService.saveProcessState(process);
      } else {
        await this.completeProcess(process);
      }
      return;
    }

    if (templateStep.type === "request") {
      const requestStep = templateStep as RequestTemplateStep;
      const stepKey = currentStep.stepKey;
      const response = await agentService.runAgent({
        systemPrompt: requestStep.prompt ?? "",
        context: process.context,
      });
      process.context[stepKey] = { response };
      const nextStepKey = requestStep.nextStepKey;
      if (nextStepKey && getStepByKey(process.template, nextStepKey)) {
        pushStep(process, nextStepKey);
      } else {
        await this.completeProcess(process);
      }
      await storageService.saveProcessState(process);
      return;
    }
  },
};
