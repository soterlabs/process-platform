import type { ProcessStep } from "./process-step";
import type { ProcessStatus } from "./process-status";
import type { StepContextAuditEntry } from "./step-context-audit";
import type { Template } from "@/entities/template";

export type Process = {
  processId: string;
  template: Template;
  status: ProcessStatus;
  steps: ProcessStep[];
  context: Record<string, unknown>;
  stepContextAudit: StepContextAuditEntry[];
  result: Record<string, unknown>;
  triggeredBy?: string;
  ranByName?: string;
  startedAt: string;
  updatedAt: string;
  error?: string;
};