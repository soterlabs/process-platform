import { absoluteProcessViewUrl } from "@/lib/process-view-url";

/** Read-only snapshot of the running process, exposed as `currentProcess` in expressions. */
export type CurrentProcessExpressionContext = {
  id: string;
  /** Absolute URL to open this process in the app */
  url: string;
  /** Template key this run was started from */
  templateKey: string;
  /** e.g. running, completed */
  status: string;
  startedAt: string;
  updatedAt: string;
};

export function buildCurrentProcessExpressionContext(input: {
  id?: string | null;
  templateKey?: string | null;
  status?: string | null;
  startedAt?: string | null;
  updatedAt?: string | null;
}): CurrentProcessExpressionContext {
  const id = (input.id ?? "").trim();
  return {
    id,
    url: absoluteProcessViewUrl(id),
    templateKey: String(input.templateKey ?? "").trim(),
    status: String(input.status ?? "").trim(),
    startedAt: String(input.startedAt ?? "").trim(),
    updatedAt: String(input.updatedAt ?? "").trim(),
  };
}

/** Fields to pass into `evaluate(..., options)` for process-bound expressions. */
export type ExpressionProcessEvaluateFields = {
  processId: string;
  templateKey?: string;
  processStatus?: string;
  processStartedAt?: string;
  processUpdatedAt?: string;
};

export function expressionEvaluateOptionsFromProcess(process: {
  processId: string;
  template: { key: string };
  status: string;
  startedAt: string;
  updatedAt: string;
}): ExpressionProcessEvaluateFields {
  return {
    processId: process.processId,
    templateKey: process.template.key,
    processStatus: process.status,
    processStartedAt: process.startedAt,
    processUpdatedAt: process.updatedAt,
  };
}
