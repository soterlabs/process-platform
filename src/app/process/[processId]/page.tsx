"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { authFetch } from "@/lib/auth-client";
import { hasPermission } from "@/lib/permissions";
import { useMe } from "@/hooks/use-me";
import {
  generatePayload,
  keccak256,
  LIMIT_COLLECT,
  LIMIT_SUBSCRIBE,
  makeAddressKey,
} from "@/lib/eth-expression-vm";
import {
  buildInputStepContextPayload,
  itemListFormKey,
  itemListRenderRowCount,
  itemListRowIsEmpty,
  numberContextToFormString,
  removeItemListRow,
  reorderItemListRows,
} from "@/lib/input-step-payload";
import { buildCurrentProcessExpressionContext } from "@/lib/expression-process-context";
import { evaluate, type EvaluateExpressionOptions } from "@/services/expression-service";
import type { TemplateStepInput } from "@/entities/template";
import { StepInputControl, expansionFieldInitialFormValue } from "./_components/StepInputControl";

type CurrentStep = {
  key: string;
  title: string;
  type: string;
  inputs?: TemplateStepInput[];
  permissions?: string[];
  completeExpression?: string;
  nextStepKey: string | null;
  confirmationMessage?: string;
};

function mergeLiveStepContextSlice(
  processContext: Record<string, unknown>,
  stepKey: string,
  step: CurrentStep,
  formValues: Record<string, boolean | string>
): Record<string, unknown> {
  const base = { ...processContext };
  const cur = (base[stepKey] as Record<string, unknown>) ?? {};
  const slice = buildInputStepContextPayload(step.inputs ?? [], formValues);
  return { ...base, [stepKey]: { ...cur, ...slice } };
}

type ResultViewControl = { data: string; title: string; visibleExpression?: string };

type ProcessState = {
  processId: string;
  template: {
    key?: string;
    steps: CurrentStep[];
    resultViewControls?: ResultViewControl[];
  };
  steps: { id: string; processId?: string; stepKey: string }[];
  context: Record<string, unknown>;
  result?: Record<string, unknown>;
  status: string;
  startedAt?: string;
  updatedAt?: string;
  canActOnCurrentStep?: boolean;
  canCompleteCurrentStep?: boolean;
};

const POLL_INTERVAL_MS = 3000;

type ClientExpressionProcessOptions = Pick<
  EvaluateExpressionOptions,
  "processId" | "templateKey" | "processStatus" | "processStartedAt" | "processUpdatedAt"
>;

function clientExpressionProcessOptions(
  proc: ProcessState | null,
  routeProcessId: string
): ClientExpressionProcessOptions {
  return {
    processId: proc?.processId ?? routeProcessId,
    templateKey: proc?.template?.key,
    processStatus: proc?.status,
    processStartedAt: proc?.startedAt,
    processUpdatedAt: proc?.updatedAt,
  };
}

/** Get value from context by dot path, e.g. "stepKey.fieldKey" */
function getContextValue(context: Record<string, unknown>, path: string): unknown {
  const dot = path.indexOf(".");
  const stepKey = dot >= 0 ? path.slice(0, dot) : path;
  const fieldKey = dot >= 0 ? path.slice(dot + 1) : path;
  const stepData = context[stepKey] as Record<string, unknown> | undefined;
  return stepData?.[fieldKey];
}

function contextValueToDisplayString(val: unknown): string {
  if (val === undefined || val === null) return "";
  if (typeof val === "string") return val;
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (typeof val === "number") return Number.isFinite(val) ? String(val) : "";
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

/**
 * Evaluate a JavaScript expression with a limited scope (context keys, keccak256,
 * generatePayload, Date/Math/JSON). Used for {{ expression }} in templates.
 * Returns string; on error returns "".
 */
/** Must not collide with parameters passed into the template Function (avoids SyntaxError). */
const TEMPLATE_EXPR_RESERVED_KEYS = new Set([
  "context",
  "keccak256",
  "generatePayload",
  "makeAddressKey",
  "hasPermission",
  "LIMIT_SUBSCRIBE",
  "LIMIT_COLLECT",
  "Date",
  "Math",
  "JSON",
  "Number",
  "String",
  "Boolean",
  "currentProcess",
]);

function evalTemplateExpression(
  expr: string,
  context: Record<string, unknown>,
  userPermissions: string[] = [],
  processOpts?: ClientExpressionProcessOptions
): string {
  try {
    const keys = Object.keys(context).filter(
      (k) => /^[a-zA-Z_$][\w$]*$/.test(k) && !TEMPLATE_EXPR_RESERVED_KEYS.has(k)
    );
    const hasPermissionBound = (p: string) => hasPermission(userPermissions, p);
    const currentProcessValue = buildCurrentProcessExpressionContext({
      id: processOpts?.processId,
      templateKey: processOpts?.templateKey,
      status: processOpts?.processStatus,
      startedAt: processOpts?.processStartedAt,
      updatedAt: processOpts?.processUpdatedAt,
    });
    const fn = new Function(
      "context",
      "keccak256",
      "generatePayload",
      "makeAddressKey",
      "hasPermission",
      "LIMIT_SUBSCRIBE",
      "LIMIT_COLLECT",
      "currentProcess",
      ...keys,
      "Date",
      "Math",
      "JSON",
      "Number",
      "String",
      "Boolean",
      `"use strict"; return (${expr.trim()});`
    );
    const result = fn(
      context,
      keccak256,
      generatePayload,
      makeAddressKey,
      hasPermissionBound,
      LIMIT_SUBSCRIBE,
      LIMIT_COLLECT,
      currentProcessValue,
      ...keys.map((k) => context[k]),
      Date,
      Math,
      JSON,
      Number,
      String,
      Boolean
    );
    if (result === undefined || result === null) return "";
    if (typeof result === "string") return result;
    if (typeof result === "boolean") return result ? "Yes" : "No";
    if (typeof result === "number" && !Number.isFinite(result)) return "";
    return String(result);
  } catch (err) {
    console.error("[evalTemplateExpression]", err instanceof Error ? err.message : err, {
      expr: expr.trim().slice(0, 200),
    });
    return "";
  }
}

/**
 * Resolve a template string:
 * - "{{ expression }}" → JavaScript with context step keys, keccak256, generatePayload, Date/Math/JSON.
 * - "${path}" → context lookup by dot path (e.g. stepKey.fieldKey).
 * Plain text is left as-is.
 */
function resolveContextTemplate(
  data: string,
  context: Record<string, unknown>,
  userPermissions: string[] = [],
  processOpts?: ClientExpressionProcessOptions
): string {
  let out = data;
  // First: replace {{ expression }} with eval result
  out = out.replace(/\{\{([\s\S]*?)\}\}/g, (_, expr: string) =>
    evalTemplateExpression(expr, context, userPermissions, processOpts)
  );
  // Then: replace ${ path } with context lookup (backward compatible)
  if (/\$\{[^}]+\}/.test(out)) {
    out = out.replace(/\$\{([^}]+)\}/g, (_, path: string) => {
      const val = getContextValue(context, path.trim());
      return contextValueToDisplayString(val);
    });
  }
  return out;
}

/** True if we should show: no placeholders, or {{ }} present, or at least one ${path} exists in context */
function shouldShowViewControl(
  data: string,
  context: Record<string, unknown>
): boolean {
  if (/\{\{[\s\S]*?\}\}/.test(data)) return true;
  const re = /\$\{([^}]+)\}/g;
  let hasAny = false;
  let m: RegExpExecArray | null;
  while ((m = re.exec(data)) !== null) {
    hasAny = true;
    if (getContextValue(context, m[1].trim()) !== undefined) return true;
  }
  return !hasAny;
}

function getCurrentProcessStepFromState(
  process: ProcessState
): { id: string; stepKey: string } | null {
  if (process.steps.length === 0) return null;
  const s = process.steps[process.steps.length - 1];
  return { id: s.id, stepKey: s.stepKey };
}

function getCurrentStep(process: ProcessState): CurrentStep | null {
  const current = getCurrentProcessStepFromState(process);
  if (!current) return null;
  return process.template.steps.find((s) => s.key === current.stepKey) ?? null;
}

function getCurrentStepIndex(process: ProcessState): number {
  const current = getCurrentProcessStepFromState(process);
  if (!current) return -1;
  const i = process.template.steps.findIndex((s) => s.key === current.stepKey);
  return i >= 0 ? i : -1;
}

function StepRequiredPermissions({ permissions }: { permissions: string[] | undefined }) {
  if (!permissions?.length) return null;
  return (
    <div
      className="mt-3 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2.5"
      role="status"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-amber-900/70">
        Permission required
      </p>
      <p className="mt-1 text-sm text-amber-950/90">
        This step can only be completed by an account with at least one of:
      </p>
      <ul className="mt-2 flex flex-wrap gap-2" aria-label="Required permissions">
        {permissions.map((p) => (
          <li key={p}>
            <span className="inline-block rounded-md bg-white/90 px-2 py-0.5 font-mono text-xs text-amber-950 shadow-sm ring-1 ring-amber-200/80">
              {p}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StepProgress({
  steps,
  currentStepIndex,
}: {
  steps: { key: string; title: string }[];
  currentStepIndex: number;
}) {
  return (
    <nav
      className="flex items-center justify-center gap-1 py-6"
      aria-label="Progress"
    >
      {steps.map((s, index) => {
        const isCompleted = index < currentStepIndex || currentStepIndex === -1;
        const isCurrent = index === currentStepIndex;
        return (
          <div key={s.key} className="flex items-center">
            {index > 0 && (
              <div
                className={`h-0.5 w-4 sm:w-6 ${
                  isCompleted ? "bg-primary-300" : "bg-surface-200"
                }`}
                aria-hidden
              />
            )}
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                isCompleted
                  ? "bg-primary-500 text-white"
                  : isCurrent
                    ? "border-2 border-primary-400 bg-primary-600 text-white ring-2 ring-primary-200"
                    : "border-2 border-surface-300 bg-white text-surface-500"
              }`}
              title={s.title}
              aria-current={isCurrent ? "step" : undefined}
            >
              {isCompleted ? (
                <span aria-hidden>✓</span>
              ) : (
                <span aria-hidden>{index + 1}</span>
              )}
            </span>
          </div>
        );
      })}
    </nav>
  );
}

export default function ProcessStepPage() {
  const { me } = useMe();
  const params = useParams();
  const processId = params.processId as string;
  const [process, setProcess] = useState<ProcessState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, boolean | string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);
  const updateStepContextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchProcess = useCallback(async () => {
    const res = await authFetch(`/api/process/${processId}`, {
      cache: "no-store",
    });
    if (res.status === 404) {
      const data = await res.json().catch(() => ({}));
      return { error: (data.error as string) ?? "Not found" };
    }
    if (!res.ok) return { error: "Failed to load process" };
    const data = await res.json();
    return { process: data as ProcessState };
  }, [processId]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchProcess();
        if (cancelled) return;
        if ("error" in result) {
          setError(result.error ?? null);
          setProcess(null);
          return;
        }
        const proc = result.process;
        setProcess(proc);
        const step = getCurrentStep(proc);
        const currentProcessStep = getCurrentProcessStepFromState(proc);
        const stepContext = currentProcessStep
          ? (proc.context[currentProcessStep.stepKey] as Record<string, unknown>)
          : undefined;
        if (step?.inputs?.length) {
          const context = proc.context;
          setFormValues((prev) => {
            const next = { ...prev };
            step.inputs?.forEach((inp) => {
              if (inp.type === "item_list") return;
              if (inp.readOnly) return;
              if (inp.key in next) return;
              const raw = stepContext?.[inp.key];
              if (raw !== undefined && raw !== null) {
                if (inp.type === "bool") next[inp.key] = Boolean(raw);
                else if (inp.type === "number") next[inp.key] = numberContextToFormString(raw);
                else if (inp.type === "decimal_string")
                  next[inp.key] = typeof raw === "string" ? raw : "";
                else next[inp.key] = String(raw);
                return;
              }
              if (inp.defaultValue != null && inp.defaultValue !== "") {
                const resolved = resolveContextTemplate(
                  inp.defaultValue,
                  context,
                  me?.permissions ?? [],
                  clientExpressionProcessOptions(proc, proc.processId)
                );
                if (inp.type === "bool") {
                  next[inp.key] = /^(yes|true|1)$/i.test(resolved.trim());
                } else {
                  next[inp.key] = resolved;
                }
                return;
              }
              next[inp.key] = inp.type === "bool" ? false : "";
            });
            step.inputs?.forEach((inp) => {
              if (inp.type !== "item_list" || !inp.subInputs?.length) return;
              const saved = stepContext?.[inp.key];
              const rows = Array.isArray(saved) ? saved : [];
              const n = Math.max(rows.length, 1);
              for (let rowIndex = 0; rowIndex < n; rowIndex++) {
                inp.subInputs.forEach((sub) => {
                  if (sub.readOnly || sub.type === "item_list") return;
                  const fk = itemListFormKey(inp.key, rowIndex, sub.key);
                  if (fk in next) return;
                  const rowObj = rows[rowIndex];
                  const raw =
                    rowObj && typeof rowObj === "object" && !Array.isArray(rowObj)
                      ? (rowObj as Record<string, unknown>)[sub.key]
                      : undefined;
                  if (raw !== undefined && raw !== null) {
                    next[fk] = expansionFieldInitialFormValue(sub, raw);
                    return;
                  }
                  if (sub.defaultValue != null && sub.defaultValue !== "") {
                    const resolved = resolveContextTemplate(
                      sub.defaultValue,
                      context,
                      me?.permissions ?? [],
                      clientExpressionProcessOptions(proc, proc.processId)
                    );
                    if (sub.type === "bool") {
                      next[fk] = /^(yes|true|1)$/i.test(resolved.trim());
                    } else {
                      next[fk] = resolved;
                    }
                    return;
                  }
                  next[fk] = sub.type === "bool" ? false : "";
                });
              }
            });
            return next;
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [processId, fetchProcess, me?.permissions]);

  // Poll when current step is non-user (waiting for agent/backend)
  const step = process ? getCurrentStep(process) : null;
  useEffect(() => {
    if (loading || error || !process || !step) return;
    if (step.type === "input") return;

    const t = setInterval(async () => {
      const result = await fetchProcess();
      if ("process" in result && result.process)
        setProcess(result.process);
      else if ("process" in result) setProcess(null);
      if ("error" in result) setError(result.error ?? null);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [loading, error, process?.processId, step?.key, processId, fetchProcess]);

  /** Debounced PUT to update step context when any input changes. */
  const scheduleStepContextUpdate = useCallback(
    (nextFormValues: Record<string, boolean | string>) => {
      const currentProcessStep = process ? getCurrentProcessStepFromState(process) : null;
      if (!process || !step || !currentProcessStep) return;
      const hasAnything = (step.inputs?.length ?? 0) > 0;
      if (!hasAnything) return;
      if (updateStepContextTimerRef.current) clearTimeout(updateStepContextTimerRef.current);
      updateStepContextTimerRef.current = setTimeout(async () => {
        updateStepContextTimerRef.current = null;
        const payload = buildInputStepContextPayload(step.inputs ?? [], nextFormValues);
        if (Object.keys(payload).length === 0) return;
        try {
          const res = await authFetch(
            `/api/process/${processId}/steps/${encodeURIComponent(currentProcessStep.id)}`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            }
          );
          if (res.ok) {
            const data = (await res.json()) as ProcessState;
            setProcess((prev) =>
              prev
                ? {
                    ...prev,
                    context: data.context,
                  }
                : null
            );
          }
        } catch {
          // ignore
        }
      }, 400);
    },
    [process, processId, step]
  );

  useEffect(() => {
    return () => {
      if (updateStepContextTimerRef.current) clearTimeout(updateStepContextTimerRef.current);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentProcessStep = process ? getCurrentProcessStepFromState(process) : null;
    if (
      !step ||
      !(step.inputs?.length ?? 0) ||
      submitting ||
      !process ||
      !currentProcessStep
    )
      return;
    const userPerms = me?.permissions ?? [];
    const completeExpr = step?.completeExpression?.trim();
    if (completeExpr) {
      const ctx = process
        ? step?.key
          ? mergeLiveStepContextSlice(process.context, step.key, step, formValues)
          : process.context
        : {};
      if (
        !evaluate(ctx, completeExpr, {
          userPermissions: userPerms,
          ...clientExpressionProcessOptions(process, processId),
        })
      ) {
        setError("You are not allowed to finish this step with the current account or data.");
        return;
      }
    }
    setSubmitting(true);
    try {
      const payload = buildInputStepContextPayload(step.inputs ?? [], formValues);
      const res = await authFetch(
        `/api/process/${processId}/steps/${encodeURIComponent(currentProcessStep.id)}/complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data.error as string) ?? "Failed to complete step");
        return;
      }
      setError(null);
      const completedStepConfirmation = step.confirmationMessage?.trim();
      const result = await fetchProcess();
      if ("process" in result) {
        const nextProcess = result.process!;
        setProcess(nextProcess);
        if (completedStepConfirmation && nextProcess.canActOnCurrentStep === false) {
          setConfirmationMessage(completedStepConfirmation);
        }
      } else if ("error" in result) {
        setError(result.error ?? null);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !process) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <div className="flex flex-col items-center gap-4">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-surface-300 border-t-primary-600"
            aria-hidden
          />
          <p className="text-surface-500">Loading…</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <p className="text-red-600">{error}</p>
        <Link
          href="/"
          className="mt-4 inline-block text-primary-600 hover:text-primary-700"
        >
          ← Back to home
        </Link>
      </main>
    );
  }

  const currentStepIndex = process ? getCurrentStepIndex(process) : 0;
  const isProcessCompleted = process?.status === "completed";

  // While submitting (e.g. right after Continue), show waiting indicator immediately
  if (submitting && process && !isProcessCompleted) {
    const nextStepTitle = process.template.steps[currentStepIndex + 1]?.title ?? "Processing…";
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <Link href="/" className="text-surface-500 hover:text-surface-700">
          ← Back to home
        </Link>
        <StepProgress
          steps={process.template.steps.map((s) => ({ key: s.key, title: s.title }))}
          currentStepIndex={currentStepIndex + 1}
        />
        <div className="flex flex-col items-center gap-4">
          <div
            className="h-10 w-10 animate-spin rounded-full border-2 border-surface-300 border-t-primary-600"
            aria-hidden
          />
          <p className="text-surface-500">Please wait…</p>
          <p className="text-sm text-surface-500">{nextStepTitle}</p>
        </div>
      </main>
    );
  }

  // Process completed: show completion state (no busy indicator) and resultViewControls
  if (isProcessCompleted && process) {
    const resultData =
      process.result && Object.keys(process.result).length > 0
        ? process.result
        : Object.fromEntries(
            process.template.steps
              .filter((s) => s.type === "request")
              .map((s) => [s.key, process.context[s.key]])
              .filter(
                ([, v]) =>
                  v != null &&
                  typeof v === "object" &&
                  "response" in v &&
                  typeof (v as { response: unknown }).response === "string"
              )
              .map(([k, v]) => [k, (v as { response: string }).response])
          );
    const hasResult = Object.keys(resultData).length > 0;
    const resolvedResultViewControls = (process.template.resultViewControls ?? [])
      .filter(
        (vc) =>
          (!vc.visibleExpression ||
            Boolean(
              evaluate(process.context, vc.visibleExpression, {
                userPermissions: me?.permissions ?? [],
                ...clientExpressionProcessOptions(process, process.processId),
              })
            )) &&
          shouldShowViewControl(vc.data, process.context)
      );
    const showResultViewControls = resolvedResultViewControls.length > 0;
    const showFallbackResult = hasResult && !showResultViewControls;

    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <Link href="/" className="text-surface-500 hover:text-surface-700">
          ← Back to home
        </Link>
        <StepProgress
          steps={process.template.steps.map((s) => ({ key: s.key, title: s.title }))}
          currentStepIndex={-1}
        />
        <h1 className="text-2xl font-semibold text-surface-900">
          Process completed
        </h1>
        <p className="mt-1 text-surface-500">
          This process has finished.
        </p>
        {showResultViewControls && (
          <section className="mt-8 space-y-4">
            <h2 className="text-sm font-medium uppercase tracking-wider text-surface-500">
              Result
            </h2>
            {resolvedResultViewControls.map((vc, i) => {
              const display = resolveContextTemplate(
                vc.data,
                process.context,
                me?.permissions ?? [],
                clientExpressionProcessOptions(process, process.processId)
              );
              return (
                <div
                  key={`${vc.data}-${vc.title}-${i}`}
                  className="rounded-xl border border-surface-200 bg-surface-50 px-4 py-4"
                >
                  <div className="text-sm font-medium text-surface-600">{vc.title}</div>
                  <div
                    className="mt-2 text-surface-800 [&_a]:text-primary-600 [&_a:hover]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2"
                    aria-readonly
                    dangerouslySetInnerHTML={{ __html: display }}
                  />
                </div>
              );
            })}
          </section>
        )}
        {showFallbackResult && (
          <section className="mt-8 space-y-4">
            <h2 className="text-sm font-medium uppercase tracking-wider text-surface-500">
              Result
            </h2>
            {Object.entries(resultData).map(([key, value]) => {
              const step = process.template.steps.find((s) => s.key === key);
              const label = step?.title ?? key;
              const text =
                typeof value === "string"
                  ? value
                  : JSON.stringify(value, null, 2);
              return (
                <div
                  key={key}
                  className="rounded-xl border border-surface-200 bg-surface-50 px-4 py-4"
                >
                  <div className="text-sm font-medium text-surface-600">{label}</div>
                  <pre className="mt-2 whitespace-pre-wrap font-sans text-sm text-surface-800">
                    {text}
                  </pre>
                </div>
              );
            })}
          </section>
        )}
        <Link
          href="/"
          className="mt-8 inline-block rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
        >
          Back to home
        </Link>
      </main>
    );
  }

  const isUserStep = step?.type === "input";
  const canAct = process?.canActOnCurrentStep ?? false;

  if (confirmationMessage && process) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <Link href="/" className="text-surface-500 hover:text-surface-700">
          ← Back to home
        </Link>
        <StepProgress
          steps={process.template.steps.map((s) => ({ key: s.key, title: s.title }))}
          currentStepIndex={currentStepIndex}
        />
        <p className="mt-6 text-surface-800">{confirmationMessage}</p>
        <Link
          href="/"
          className="mt-8 inline-block text-surface-600 hover:text-surface-800"
        >
          Back to home
        </Link>
      </main>
    );
  }

  if ((!isUserStep || !canAct) && step && process && !isProcessCompleted) {
    const showPermissionGate = isUserStep && !canAct;
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <Link href="/" className="text-surface-500 hover:text-surface-700">
          ← Back to home
        </Link>
        <StepProgress
          steps={process.template.steps.map((s) => ({ key: s.key, title: s.title }))}
          currentStepIndex={currentStepIndex}
        />
        {showPermissionGate ? (
          <>
            <h1 className="mt-6 text-2xl font-semibold text-surface-900">{step.title}</h1>
            <StepRequiredPermissions permissions={step.permissions} />
            <p className="mt-4 text-surface-600">
              {step.permissions?.length
                ? "Your current account doesn’t have permission to complete this step. Use an account with one of the permissions above, or ask an administrator to grant access."
                : "You can’t complete this step with your current account."}
            </p>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div
              className="h-10 w-10 animate-spin rounded-full border-2 border-surface-300 border-t-primary-600"
              aria-hidden
            />
            <p className="text-surface-500">Please wait…</p>
            {!isUserStep && (
              <p className="text-sm text-surface-500">{step.title}</p>
            )}
          </div>
        )}
      </main>
    );
  }

  const isLastStepInTemplate = step != null && step.nextStepKey === null;

  /** Merge live form values into the current step for expressions / readOnly views. */
  const evaluationContext = process
    ? step?.key
      ? mergeLiveStepContextSlice(process.context, step.key, step, formValues)
      : process.context
    : {};

  const userPerms = me?.permissions ?? [];
  const completeExprLive = step?.completeExpression?.trim();
  const canShowCompleteButton =
    !completeExprLive ||
    Boolean(
      evaluate(evaluationContext, completeExprLive, {
        userPermissions: userPerms,
        ...clientExpressionProcessOptions(process, processId),
      })
    );

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/" className="text-surface-500 hover:text-surface-700">
        ← Back to home
      </Link>
      {process && (
        <StepProgress
          steps={process.template.steps.map((s) => ({ key: s.key, title: s.title }))}
          currentStepIndex={currentStepIndex}
        />
      )}
      <h1 className="mt-6 text-2xl font-semibold text-surface-900">{step?.title}</h1>
      <StepRequiredPermissions permissions={step?.permissions} />
      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        {step?.inputs
          ?.filter(
            (inp) =>
              (!inp.visibleExpression ||
                Boolean(
                  process &&
                    evaluate(evaluationContext, inp.visibleExpression, {
                      userPermissions: userPerms,
                      ...clientExpressionProcessOptions(process, processId),
                    })
                )) &&
              (inp.readOnly
                ? process
                  ? shouldShowViewControl(inp.defaultValue ?? "", evaluationContext)
                  : true
                : true)
          )
          .map((inp, i) => {
            if (inp.type === "item_list" && !inp.readOnly) {
              const subInputs = inp.subInputs ?? [];
              const rowCount = itemListRenderRowCount(inp.key, subInputs, formValues);
              if (subInputs.length === 0 || rowCount === 0) {
                return (
                  <div
                    key={inp.key}
                    className="rounded-xl border border-amber-200 bg-amber-50/40 px-4 py-4"
                  >
                    <div className="text-sm font-medium text-surface-800">{inp.title}</div>
                    <p className="mt-1 text-xs text-surface-600">
                      This item list has no sub-fields in the template.
                    </p>
                  </div>
                );
              }
              const visibleSubs = subInputs.filter(
                (sub) =>
                  (!sub.visibleExpression ||
                    Boolean(
                      process &&
                        evaluate(evaluationContext, sub.visibleExpression, {
                          userPermissions: userPerms,
                          ...clientExpressionProcessOptions(process, processId),
                        })
                    )) &&
                  (sub.readOnly
                    ? process
                      ? shouldShowViewControl(sub.defaultValue ?? "", evaluationContext)
                      : true
                    : true)
              );
              const primarySub =
                visibleSubs.find((s) => !s.readOnly && s.type !== "item_list") ?? visibleSubs[0];
              const otherSubs = primarySub
                ? visibleSubs.filter((s) => s !== primarySub)
                : visibleSubs;

              if (visibleSubs.length === 0) {
                return (
                  <div
                    key={inp.key}
                    className="rounded-xl border border-amber-200 bg-amber-50/40 px-4 py-4"
                  >
                    <div className="text-sm font-medium text-surface-800">{inp.title}</div>
                    <p className="mt-1 text-xs text-surface-600">
                      No visible sub-fields for this list (check visibility expressions).
                    </p>
                  </div>
                );
              }

              const renderSubControl = (
                sub: TemplateStepInput,
                rowIndex: number,
                j?: number,
                hideFieldTitle?: boolean
              ) =>
                sub.readOnly ? (
                  <div
                    key={`${inp.key}-${rowIndex}-${sub.key}-${j ?? "ro"}`}
                    className="rounded-lg border border-surface-200 bg-surface-50 px-3 py-3"
                  >
                    <div className="text-sm font-medium text-surface-600">{sub.title}</div>
                    <div
                      className={
                        sub.type === "string-multiline" || sub.type === "decimal_string"
                          ? "mt-2 whitespace-pre-wrap break-all font-mono text-sm leading-relaxed text-surface-800 [&_a]:text-primary-600 [&_a:hover]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2"
                          : "mt-2 text-surface-800 [&_a]:text-primary-600 [&_a:hover]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2"
                      }
                      aria-readonly
                      dangerouslySetInnerHTML={{
                        __html: process
                          ? resolveContextTemplate(
                              sub.defaultValue ?? "",
                              evaluationContext,
                              userPerms,
                              clientExpressionProcessOptions(process, processId)
                            )
                          : sub.defaultValue ?? "",
                      }}
                    />
                  </div>
                ) : (
                  <div key={`${inp.key}-${rowIndex}-${sub.key}`} className="min-w-0">
                    <StepInputControl
                      inp={sub}
                      formKey={itemListFormKey(inp.key, rowIndex, sub.key)}
                      htmlId={`il-${inp.key}-${rowIndex}-${sub.key}`}
                      formValues={formValues}
                      hideTitle={Boolean(hideFieldTitle)}
                      onValuesChange={(next) => {
                        setFormValues(next);
                        scheduleStepContextUpdate(next);
                      }}
                    />
                  </div>
                );

              const onRemoveRow = (rowIndex: number) => {
                setFormValues((prev) => {
                  const next = removeItemListRow(inp.key, subInputs, rowIndex, prev);
                  scheduleStepContextUpdate(next);
                  return next;
                });
              };

              const onReorderRow = (fromIndex: number, toIndex: number) => {
                setFormValues((prev) => {
                  const next = reorderItemListRows(inp.key, subInputs, fromIndex, toIndex, prev);
                  scheduleStepContextUpdate(next);
                  return next;
                });
              };

              return (
                <section
                  key={inp.key}
                  className="rounded-xl border border-primary-200 bg-primary-50/50 px-4 py-4"
                  aria-labelledby={`il-head-${inp.key}`}
                >
                  <h2 id={`il-head-${inp.key}`} className="text-sm font-medium text-primary-950">
                    {inp.title}
                  </h2>

                  {primarySub && (
                    <div className="mt-4 rounded-lg border border-surface-200 bg-white px-3 py-4 shadow-sm">
                      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-surface-500">
                        {primarySub.title}
                      </div>
                      <div className="space-y-2">
                        {Array.from({ length: rowCount }, (_, rowIndex) => (
                          <div
                            key={`pri-${rowIndex}`}
                            className="flex items-center gap-2 rounded-lg border border-surface-100 bg-surface-50/60 px-2 py-2"
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = "move";
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              const from = parseInt(e.dataTransfer.getData("text/plain"), 10);
                              if (!Number.isInteger(from)) return;
                              onReorderRow(from, rowIndex);
                            }}
                          >
                            <button
                              type="button"
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData("text/plain", String(rowIndex));
                                e.dataTransfer.effectAllowed = "move";
                              }}
                              className="flex h-9 w-7 shrink-0 cursor-grab flex-col items-center justify-center rounded border border-transparent text-surface-400 hover:border-surface-200 hover:bg-white active:cursor-grabbing"
                              aria-label="Drag to reorder row"
                            >
                              <span className="text-[10px] leading-none" aria-hidden>
                                ⋮⋮
                              </span>
                            </button>
                            <span className="w-6 shrink-0 text-right text-[11px] font-medium text-surface-400">
                              {rowIndex + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              {renderSubControl(primarySub, rowIndex, 0, true)}
                            </div>
                            {!itemListRowIsEmpty(inp.key, subInputs, rowIndex, formValues) && (
                              <button
                                type="button"
                                onClick={() => onRemoveRow(rowIndex)}
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-transparent text-xl leading-none text-surface-400 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                                aria-label="Remove row"
                              >
                                <span aria-hidden>×</span>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {otherSubs.length > 0 && (
                    <div className="mt-6 rounded-lg border border-surface-200 bg-white px-3 py-4 shadow-sm">
                      <div className="divide-y divide-surface-100">
                        {Array.from({ length: rowCount }, (_, rowIndex) => {
                          const primaryRaw = primarySub
                            ? formValues[itemListFormKey(inp.key, rowIndex, primarySub.key)]
                            : undefined;
                          const primaryLabel =
                            primarySub?.type === "bool"
                              ? primaryRaw === true
                                ? "Yes"
                                : primaryRaw === false
                                  ? "No"
                                  : ""
                              : primaryRaw !== undefined &&
                                  primaryRaw !== true &&
                                  primaryRaw !== false
                                ? String(primaryRaw).trim()
                                : "";
                          return (
                            <div
                              key={`rest-row-${rowIndex}`}
                              className="space-y-3 py-3 first:pt-0"
                            >
                              <p
                                className={`truncate text-sm font-medium ${primaryLabel ? "text-surface-900" : "text-surface-500"}`}
                                title={primaryLabel || undefined}
                              >
                                {primaryLabel || `Row ${rowIndex + 1}`}
                              </p>
                              {otherSubs.map((sub) => (
                                <div key={`${rowIndex}-${sub.key}`} className="min-w-0">
                                  {renderSubControl(sub, rowIndex)}
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </section>
              );
            }
            if (inp.readOnly) {
              return (
                <div
                  key={`${inp.key}-${i}`}
                  className="rounded-xl border border-surface-200 bg-surface-50 px-4 py-4"
                >
                  <div className="text-sm font-medium text-surface-600">{inp.title}</div>
                  <div
                    className={
                      inp.type === "string-multiline" || inp.type === "decimal_string"
                        ? "mt-2 whitespace-pre-wrap break-all font-mono text-sm leading-relaxed text-surface-800 [&_a]:text-primary-600 [&_a:hover]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2"
                        : "mt-2 text-surface-800 [&_a]:text-primary-600 [&_a:hover]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2"
                    }
                    aria-readonly
                    dangerouslySetInnerHTML={{
                      __html: process
                        ? resolveContextTemplate(
                            inp.defaultValue ?? "",
                            evaluationContext,
                            userPerms,
                            clientExpressionProcessOptions(process, processId)
                          )
                        : inp.defaultValue ?? "",
                    }}
                  />
                </div>
              );
            }
            return (
              <div
                key={inp.key}
                className="rounded-xl border border-surface-200 bg-surface-50 px-4 py-4"
              >
                <StepInputControl
                  inp={inp}
                  formKey={inp.key}
                  htmlId={inp.key}
                  formValues={formValues}
                  onValuesChange={(next) => {
                    setFormValues(next);
                    scheduleStepContextUpdate(next);
                  }}
                />
              </div>
            );
          })}
        {canShowCompleteButton ? (
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {submitting ? "Submitting…" : isLastStepInTemplate ? "Finish" : "Continue"}
          </button>
        ) : (
          <p className="text-sm text-surface-600" role="status">
            Continue or Finish is hidden because your account does not satisfy this step&apos;s
            completion rule. You can still edit the fields above; changes are saved automatically.
          </p>
        )}
      </form>
    </main>
  );
}
