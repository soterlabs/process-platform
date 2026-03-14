/**
 * Polling job: every second, finds running processes whose current step
 * is automatic, condition, or request and executes that step via the execution service.
 * Start with startStepExecutionJob(); stop with the returned stop function.
 */
import { executionService } from "@/services/execution-service";
import { storageService } from "@/services/storage";
import { getCurrentProcessStep, getStepByKey } from "@/services/template-helpers";

const POLL_INTERVAL_MS = 1000;

async function tick(): Promise<void> {
  const processes = await storageService.listProcesses();
  const running = processes.filter((p) => p.status === "running");
  for (const p of running) {
    const currentStep = getCurrentProcessStep(p.steps);
    if (!currentStep) continue;
    const templateStep = getStepByKey(p.template, currentStep.stepKey);
    const shouldAutoRun =
      templateStep?.type === "automatic" ||
      templateStep?.type === "condition" ||
      templateStep?.type === "request";
    if (shouldAutoRun) {
      await executionService.executeStep(p);
    }
  }
}

let intervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Starts the step execution job (polls every second).
 * Returns a function to stop the job. Idempotent: calling start again stops any existing interval first.
 */
export function startStepExecutionJob(): () => void {
  if (intervalId != null) {
    clearInterval(intervalId);
    intervalId = null;
  }
  intervalId = setInterval(() => {
    tick().catch((err) => {
      console.error("[step-execution-job]", err);
    });
  }, POLL_INTERVAL_MS);
  return () => {
    if (intervalId != null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
}

/**
 * Stops the step execution job if it is running.
 */
export function stopStepExecutionJob(): void {
  if (intervalId != null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
