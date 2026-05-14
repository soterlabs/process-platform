import { randomUUID } from "crypto";
import { type Process, SYSTEM_STEP_CONTEXT_USER_ID } from "@/entities/process";
import type {
  AutomaticTemplateStep,
  ConditionTemplateStep,
  RequestTemplateStep,
  ScriptTemplateStep,
  SlackNotifyTemplateStep,
} from "@/entities/template";
import { agentService } from "@/services/agent-service";
import { evaluate, type EvaluateExpressionOptions } from "@/services/expression-service";
import {
  getCurrentProcessStep,
  getNextStepKey,
  getProcessStepById,
  getStepByKey,
} from "@/services/template-helpers";
import { expressionEvaluateOptionsFromProcess } from "@/lib/expression-process-context";
import { postSlackChannelNotification } from "@/services/slack-notify-service";
import { runScriptTemplateStep } from "@/services/script-step-runner";
import { storageService } from "@/services/storage";

function pushStep(process: Process, stepKey: string): void {
  process.steps.push({
    id: randomUUID(),
    processId: process.processId,
    stepKey,
  });
}

function runAutomaticStep(
  step: AutomaticTemplateStep,
  context: Record<string, unknown>,
  evalOpts?: EvaluateExpressionOptions
): Record<string, unknown> {
  const value = evaluate(context, step.expression, evalOpts);
  return { ...context, [step.contextKey]: value };
}

function runConditionalStep(
  step: ConditionTemplateStep,
  context: Record<string, unknown>,
  evalOpts?: EvaluateExpressionOptions
): string | null {
  const value = evaluate(context, step.expression, evalOpts);
  if (value) return step.thenStepKey;
  else return step.elseStepKey;
}

async function runSlackNotifyStep(
  step: SlackNotifyTemplateStep,
  context: Record<string, unknown>,
  evalOpts?: EvaluateExpressionOptions
): Promise<Record<string, unknown>> {
  const rawMessage = evaluate(context, step.messageExpression, evalOpts);
  const bodyText =
    rawMessage === undefined || rawMessage === null ? "" : String(rawMessage);
  const result = await postSlackChannelNotification({
    channelId: step.channelId,
    mentionUsers: step.mentionUsers ?? [],
    bodyText,
  });
  return {
    slackNotify: {
      at: new Date().toISOString(),
      ok: result.ok,
      error: result.error,
      channelId: step.channelId,
      resolvedChannelId: result.resolvedChannelId,
      mentionUsers: step.mentionUsers ?? [],
      resolvedMentionUserIds: result.resolvedMentionUserIds,
      mentionResolveErrors: result.resolveErrors,
      skippedNotInChannel: result.skippedNotInChannel,
      ts: result.ts,
    },
  };
}

function appendStepContextAudit(
  process: Process,
  userId: string,
  stepKey: string,
  updates: Record<string, unknown>
): void {
  if (Object.keys(updates).length === 0) return;
  process.stepContextAudit.push({
    at: new Date().toISOString(),
    userId,
    stepKey,
    updates: { ...updates },
  });
}

export const executionService = {
  async getProcessState(processId: string): Promise<Process | null> {
    return storageService.getProcessState(processId);
  },

  async deleteProcessById(processId: string): Promise<void> {
    const removed = await storageService.deleteProcess(processId);
    if (!removed) throw new Error(`Process not found: ${processId}`);
  },

  async startProcess(
    templateKey: string,
    options?: { triggeredBy?: string; ranByName?: string }
  ): Promise<Process> {
    const template = await storageService.getTemplate(templateKey);
    if (!template) {
      throw new Error(`Template not found: ${templateKey}`);
    }
    const now = new Date().toISOString();
    const processId = randomUUID();
    const triggeredBy = options?.triggeredBy;
    const ranByName = options?.ranByName;
    const process: Process = {
      processId,
      template,
      status: "running",
      steps: [],
      context: {},
      stepContextAudit: [],
      result: {},
      ...(triggeredBy ? { triggeredBy } : {}),
      ...(ranByName ? { ranByName } : {}),
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
   * Non-empty payloads are appended to {@link Process.stepContextAudit}.
   */
  async updateStep(
    process: Process,
    stepId: string,
    payload: Record<string, unknown>,
    userId: string
  ): Promise<void> {
    if (process.status !== "running") {
      throw new Error(`Process is not running: ${process.status}`);
    }
    const step = getProcessStepById(process.steps, stepId);
    if (!step) throw new Error(`Step not found: ${stepId}`);
    const stepKey = step.stepKey;
    const existing = (process.context[stepKey] as Record<string, unknown>) ?? {};
    process.context[stepKey] = { ...existing, ...payload };
    appendStepContextAudit(process, userId, stepKey, payload);
    await storageService.saveProcessState(process);
  },

  async updateStepById(
    processId: string,
    stepId: string,
    payload: Record<string, unknown>,
    userId: string
  ): Promise<Process> {
    const process = await storageService.getProcessState(processId);
    if (!process) throw new Error(`Process not found: ${processId}`);
    await this.updateStep(process, stepId, payload, userId);
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
    let nextStepKey = getNextStepKey(
      process.template,
      step.stepKey,
      process.context,
      expressionEvaluateOptionsFromProcess(process)
    );
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

    const exprOpts: EvaluateExpressionOptions = expressionEvaluateOptionsFromProcess(process);

    if (templateStep.type === "automatic") {
      const newContext = runAutomaticStep(
        templateStep as AutomaticTemplateStep,
        process.context,
        exprOpts
      );
      const contextKey = (templateStep as AutomaticTemplateStep).contextKey;
      const value = newContext[contextKey];
      const stepKey = currentStep.stepKey;
      const existing = (process.context[stepKey] as Record<string, unknown>) ?? {};
      const updates = { [contextKey]: value };
      process.context[stepKey] = { ...existing, ...updates };
      appendStepContextAudit(process, SYSTEM_STEP_CONTEXT_USER_ID, stepKey, updates);
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
        process.context,
        exprOpts
      );
      if (nextKey && getStepByKey(process.template, nextKey)) {
        pushStep(process, nextKey);
        await storageService.saveProcessState(process);
      } else {
        await this.completeProcess(process);
      }
      return;
    }

    if (templateStep.type === "slack_notify") {
      const slackStep = templateStep as SlackNotifyTemplateStep;
      const stepKey = currentStep.stepKey;
      const updates = await runSlackNotifyStep(slackStep, process.context, exprOpts);
      const existing = (process.context[stepKey] as Record<string, unknown>) ?? {};
      process.context[stepKey] = { ...existing, ...updates };
      appendStepContextAudit(process, SYSTEM_STEP_CONTEXT_USER_ID, stepKey, updates);
      const nextStepKey = slackStep.nextStepKey;
      if (nextStepKey && getStepByKey(process.template, nextStepKey)) {
        pushStep(process, nextStepKey);
      } else {
        await this.completeProcess(process);
      }
      await storageService.saveProcessState(process);
      return;
    }

    if (templateStep.type === "script") {
      const scriptStep = templateStep as ScriptTemplateStep;
      const stepKey = currentStep.stepKey;
      const updates = await runScriptTemplateStep(scriptStep, process.context, exprOpts);
      const existing = (process.context[stepKey] as Record<string, unknown>) ?? {};
      process.context[stepKey] = { ...existing, ...updates };
      appendStepContextAudit(process, SYSTEM_STEP_CONTEXT_USER_ID, stepKey, updates);
      const nextStepKey = scriptStep.nextStepKey;
      if (nextStepKey && getStepByKey(process.template, nextStepKey)) {
        pushStep(process, nextStepKey);
      } else {
        await this.completeProcess(process);
      }
      await storageService.saveProcessState(process);
      return;
    }

    if (templateStep.type === "request") {
      const requestStep = templateStep as RequestTemplateStep;
      const stepKey = currentStep.stepKey;
      const response = await agentService.runAgent({
        systemPrompt: requestStep.prompt ?? "",
        context: process.context,
      });
      const updates = { response };
      process.context[stepKey] = updates;
      appendStepContextAudit(process, SYSTEM_STEP_CONTEXT_USER_ID, stepKey, updates);
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
