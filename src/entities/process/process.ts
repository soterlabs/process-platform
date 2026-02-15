import type { ProcessStatus } from "./process-status";
import type { Template } from "@/entities/template";

export type Process = {
  processId: string;
  template: Template;
  status: ProcessStatus;
  currentStepKey: string | null;
  context: Record<string, unknown>;
  result: Record<string, unknown>;
  startedAt: string;
  updatedAt: string;
  error?: string;
};