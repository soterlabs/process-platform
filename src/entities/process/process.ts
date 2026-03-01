import type { ProcessStep } from "./process-step";
import type { ProcessStatus } from "./process-status";
import type { Template } from "@/entities/template";

export type Process = {
  processId: string;
  template: Template;
  status: ProcessStatus;
  steps: ProcessStep[];
  context: Record<string, unknown>;
  result: Record<string, unknown>;
  startedAt: string;
  updatedAt: string;
  error?: string;
};