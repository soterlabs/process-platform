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
import type { NumericFieldValue } from "@/lib/numeric-field";
import {
  deserializeProcessContextNumericFields,
  numericFieldToFormString,
  sanitizeNumericFormInput,
  serializeNumericFieldFromForm,
  withDeserializedNumericContext,
} from "@/lib/numeric-field";
import { evaluate } from "@/services/expression-service";
import { DateTimePicker } from "./_components/DateTimePicker";

type StepInput = {
  key: string;
  type: "bool" | "string" | "string-multiline" | "number" | "datetime" | "dropdown";
  title: string;
  visibleExpression?: string;
  values?: string[];
  readOnly?: boolean;
  defaultValue?: string;
};

type CurrentStep = {
  key: string;
  title: string;
  type: string;
  inputs?: StepInput[];
  permissions?: string[];
  completeExpression?: string;
  nextStepKey: string | null;
  confirmationMessage?: string;
};

type ResultViewControl = { data: string; title: string; visibleExpression?: string };

type ProcessState = {
  processId: string;
  template: { steps: CurrentStep[]; resultViewControls?: ResultViewControl[] };
  steps: { id: string; processId?: string; stepKey: string }[];
  context: Record<string, unknown>;
  result?: Record<string, unknown>;
  status: string;
  canActOnCurrentStep?: boolean;
  canCompleteCurrentStep?: boolean;
};

const POLL_INTERVAL_MS = 3000;

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
  if (typeof val === "bigint") return val.toString();
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
]);

function evalTemplateExpression(
  expr: string,
  context: Record<string, unknown>,
  userPermissions: string[] = []
): string {
  try {
    const keys = Object.keys(context).filter(
      (k) => /^[a-zA-Z_$][\w$]*$/.test(k) && !TEMPLATE_EXPR_RESERVED_KEYS.has(k)
    );
    const hasPermissionBound = (p: string) => hasPermission(userPermissions, p);
    const fn = new Function(
      "context",
      "keccak256",
      "generatePayload",
      "makeAddressKey",
      "hasPermission",
      "LIMIT_SUBSCRIBE",
      "LIMIT_COLLECT",
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
    if (typeof result === "bigint") return result.toString();
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
  userPermissions: string[] = []
): string {
  let out = data;
  // First: replace {{ expression }} with eval result
  out = out.replace(/\{\{([\s\S]*?)\}\}/g, (_, expr: string) =>
    evalTemplateExpression(expr, context, userPermissions)
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

function StepCompleteRuleHint({ completeExpression }: { completeExpression: string | undefined }) {
  if (!completeExpression?.trim()) return null;
  return (
    <div
      className="mt-3 rounded-lg border border-surface-200 bg-surface-100/80 px-3 py-2.5"
      role="note"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-surface-600">
        Finishing this step
      </p>
      <p className="mt-1 text-sm text-surface-800">
        A completion rule controls who may use Continue or Finish. You can still edit fields; if the
        button is hidden, ask someone who satisfies the rule to submit.
      </p>
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
        const proc = withDeserializedNumericContext(result.process);
        setProcess(proc);
        const step = getCurrentStep(proc);
        const currentProcessStep = getCurrentProcessStepFromState(proc);
        const stepContext = currentProcessStep
          ? (proc.context[currentProcessStep.stepKey] as Record<string, unknown>)
          : undefined;
        if (step?.inputs) {
          const context = proc.context;
          setFormValues((prev) => {
            const next = { ...prev };
            step.inputs?.forEach((inp) => {
              if (inp.readOnly) return;
              if (inp.key in next) return;
              const raw = stepContext?.[inp.key];
              if (raw !== undefined && raw !== null) {
                if (inp.type === "bool") next[inp.key] = Boolean(raw);
                else if (inp.type === "number")
                  next[inp.key] = numericFieldToFormString(raw as NumericFieldValue);
                else next[inp.key] = String(raw);
                return;
              }
              if (inp.defaultValue != null && inp.defaultValue !== "") {
                const resolved = resolveContextTemplate(
                  inp.defaultValue,
                  context,
                  me?.permissions ?? []
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
        setProcess(withDeserializedNumericContext(result.process));
      else if ("process" in result) setProcess(null);
      if ("error" in result) setError(result.error ?? null);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [loading, error, process?.processId, step?.key, processId, fetchProcess]);

  /** Build the same payload we send on complete (editable inputs only). */
  const buildStepPayload = useCallback(
    (values: Record<string, boolean | string>) => {
      if (!step?.inputs?.length) return {};
      const payload: Record<string, unknown> = {};
      step.inputs.forEach((inp) => {
        if (inp.readOnly) return;
        if (inp.type === "bool") {
          payload[inp.key] = values[inp.key] ?? false;
        } else if (inp.type === "number") {
          const v = values[inp.key];
          payload[inp.key] =
            v === undefined || v === "" ? "" : serializeNumericFieldFromForm(String(v));
        } else {
          payload[inp.key] = values[inp.key] ?? "";
        }
      });
      return payload;
    },
    [step?.inputs]
  );

  /** Debounced PUT to update step context when any input changes. */
  const scheduleStepContextUpdate = useCallback(
    (nextFormValues: Record<string, boolean | string>) => {
      const currentProcessStep = process ? getCurrentProcessStepFromState(process) : null;
      if (!process || !step?.inputs?.length || !currentProcessStep) return;
      if (updateStepContextTimerRef.current) clearTimeout(updateStepContextTimerRef.current);
      updateStepContextTimerRef.current = setTimeout(async () => {
        updateStepContextTimerRef.current = null;
        const payload = buildStepPayload(nextFormValues);
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
                    context: deserializeProcessContextNumericFields(prev.template, data.context),
                  }
                : null
            );
          }
        } catch {
          // ignore
        }
      }, 400);
    },
    [process, processId, step?.inputs, buildStepPayload]
  );

  useEffect(() => {
    return () => {
      if (updateStepContextTimerRef.current) clearTimeout(updateStepContextTimerRef.current);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentProcessStep = process ? getCurrentProcessStepFromState(process) : null;
    if (!step?.inputs?.length || submitting || !process || !currentProcessStep) return;
    const userPerms = me?.permissions ?? [];
    const completeExpr = step.completeExpression?.trim();
    if (completeExpr) {
      const ctx = process
        ? (() => {
            const base = { ...process.context };
            if (step?.key) {
              const cur = (base[step.key] as Record<string, unknown>) ?? {};
              base[step.key] = { ...cur, ...formValues };
            }
            return deserializeProcessContextNumericFields(process.template, base);
          })()
        : {};
      if (!evaluate(ctx, completeExpr, { userPermissions: userPerms })) {
        setError("You are not allowed to finish this step with the current account or data.");
        return;
      }
    }
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {};
      step.inputs.forEach((inp) => {
        if (inp.readOnly) return;
        if (inp.type === "bool") {
          payload[inp.key] = formValues[inp.key] ?? false;
        } else if (inp.type === "number") {
          const v = formValues[inp.key];
          payload[inp.key] =
            v === undefined || v === "" ? "" : serializeNumericFieldFromForm(String(v));
        } else {
          payload[inp.key] = formValues[inp.key] ?? "";
        }
      });
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
        const nextProcess = withDeserializedNumericContext(result.process!);
        setProcess(nextProcess);
        if (
          completedStepConfirmation &&
          nextProcess.canActOnCurrentStep === false
        ) {
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
              const display = resolveContextTemplate(vc.data, process.context);
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

  /** Merge live form values into the current step, then re-apply numeric deserialization
   *  so readOnly {{ expressions }} (e.g. tx payload) update on every keystroke. */
  const evaluationContext = process
    ? (() => {
        const base = { ...process.context };
        if (step?.key) {
          const current = (base[step.key] as Record<string, unknown>) ?? {};
          base[step.key] = { ...current, ...formValues };
        }
        return deserializeProcessContextNumericFields(process.template, base);
      })()
    : {};

  const userPerms = me?.permissions ?? [];
  const completeExprLive = step?.completeExpression?.trim();
  const canShowCompleteButton =
    !completeExprLive ||
    Boolean(evaluate(evaluationContext, completeExprLive, { userPermissions: userPerms }));

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
      <StepCompleteRuleHint completeExpression={step?.completeExpression} />
      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        {step?.inputs
          ?.filter(
            (inp) =>
              (!inp.visibleExpression ||
                Boolean(
                  process &&
                    evaluate(evaluationContext, inp.visibleExpression, {
                      userPermissions: userPerms,
                    })
                )) &&
              (inp.readOnly
                ? process
                  ? shouldShowViewControl(inp.defaultValue ?? "", evaluationContext)
                  : true
                : true)
          )
          .map((inp, i) =>
            inp.readOnly ? (
              <div
                key={`${inp.key}-${i}`}
                className="rounded-xl border border-surface-200 bg-surface-50 px-4 py-4"
              >
                <div className="text-sm font-medium text-surface-600">{inp.title}</div>
                <div
                  className={
                    inp.type === "string-multiline"
                      ? "mt-2 whitespace-pre-wrap break-all font-mono text-sm leading-relaxed text-surface-800 [&_a]:text-primary-600 [&_a:hover]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2"
                      : "mt-2 text-surface-800 [&_a]:text-primary-600 [&_a:hover]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2"
                  }
                  aria-readonly
                  dangerouslySetInnerHTML={{
                    __html: process
                      ? resolveContextTemplate(inp.defaultValue ?? "", evaluationContext, userPerms)
                      : inp.defaultValue ?? "",
                  }}
                />
              </div>
            ) : (
          <div
            key={inp.key}
            className="rounded-xl border border-surface-200 bg-surface-50 px-4 py-4"
          >
            {inp.type === "bool" ? (
              <label className="flex cursor-pointer items-center justify-between gap-4">
                <span className="text-sm font-medium leading-snug text-surface-800">
                  {inp.title}
                </span>
                <input
                  type="checkbox"
                  checked={Boolean(formValues[inp.key])}
                  onChange={(e) => {
                    const next = { ...formValues, [inp.key]: e.target.checked };
                    setFormValues(next);
                    scheduleStepContextUpdate(next);
                  }}
                  className="sr-only"
                />
                <span
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border transition-colors ${
                    formValues[inp.key]
                      ? "border-primary-500 bg-primary-500"
                      : "border-surface-300 bg-surface-200"
                  }`}
                  aria-hidden
                >
                <span
                  className={`pointer-events-none absolute top-0.5 inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    formValues[inp.key]
                      ? "translate-x-[1.375rem]"
                      : "translate-x-0.5"
                  }`}
                />
                </span>
              </label>
            ) : inp.type === "dropdown" ? (
              <>
                <label
                  htmlFor={inp.key}
                  className="block text-sm font-medium text-surface-700"
                >
                  {inp.title}
                </label>
                <select
                  id={inp.key}
                  value={String(formValues[inp.key] ?? "")}
                  onChange={(e) => {
                    const next = { ...formValues, [inp.key]: e.target.value };
                    setFormValues(next);
                    scheduleStepContextUpdate(next);
                  }}
                  className="mt-2 w-full rounded-lg border border-surface-200 bg-white px-3 py-2.5 text-surface-900 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
                >
                  <option value="">Select…</option>
                  {(inp.values ?? []).map((val) => (
                    <option key={val} value={val}>
                      {val}
                    </option>
                  ))}
                </select>
              </>
            ) : inp.type === "number" ? (
              <>
                <label
                  htmlFor={inp.key}
                  className="block text-sm font-medium text-surface-700"
                >
                  {inp.title}
                </label>
                <input
                  id={inp.key}
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  pattern="[-0-9.]*"
                  value={String(formValues[inp.key] ?? "")}
                  onChange={(e) => {
                    const v = sanitizeNumericFormInput(e.target.value);
                    const next = { ...formValues, [inp.key]: v };
                    setFormValues(next);
                    scheduleStepContextUpdate(next);
                  }}
                  className="mt-2 w-full rounded-lg border border-surface-200 bg-white px-3 py-2.5 text-surface-900 placeholder-surface-400 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
                />
              </>
            ) : inp.type === "string-multiline" ? (
              <>
                <label
                  htmlFor={inp.key}
                  className="block text-sm font-medium text-surface-700"
                >
                  {inp.title}
                </label>
                <textarea
                  id={inp.key}
                  rows={4}
                  value={String(formValues[inp.key] ?? "")}
                  onChange={(e) => {
                    const next = { ...formValues, [inp.key]: e.target.value };
                    setFormValues(next);
                    scheduleStepContextUpdate(next);
                  }}
                  className="mt-2 w-full rounded-lg border border-surface-200 bg-white px-3 py-2.5 text-surface-900 placeholder-surface-400 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
                />
              </>
            ) : inp.type === "datetime" ? (
              <>
                <label
                  htmlFor={inp.key}
                  className="block text-sm font-medium text-surface-700"
                >
                  {inp.title}
                </label>
                <DateTimePicker
                  id={inp.key}
                  value={String(formValues[inp.key] ?? "")}
                  onChange={(v) => {
                    const next = { ...formValues, [inp.key]: v };
                    setFormValues(next);
                    scheduleStepContextUpdate(next);
                  }}
                  className="mt-2"
                />
              </>
            ) : (
              <>
                <label
                  htmlFor={inp.key}
                  className="block text-sm font-medium text-surface-700"
                >
                  {inp.title}
                </label>
                <input
                  id={inp.key}
                  type="text"
                  value={String(formValues[inp.key] ?? "")}
                  onChange={(e) => {
                    const next = { ...formValues, [inp.key]: e.target.value };
                    setFormValues(next);
                    scheduleStepContextUpdate(next);
                  }}
                  className="mt-2 w-full rounded-lg border border-surface-200 bg-white px-3 py-2.5 text-surface-900 placeholder-surface-400 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
                />
              </>
            )}
          </div>
            )
          )}
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
