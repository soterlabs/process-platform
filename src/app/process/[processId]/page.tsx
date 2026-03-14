"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { authFetch } from "@/lib/auth-client";
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

/**
 * Evaluate a JavaScript expression with a limited scope (context + safe globals).
 * Used for {{ expression }} in templates. Returns string; on error returns "".
 */
function evalTemplateExpression(
  expr: string,
  context: Record<string, unknown>
): string {
  try {
    const fn = new Function(
      "context",
      "Date",
      "Math",
      "JSON",
      "Number",
      "String",
      "Boolean",
      `"use strict"; return (${expr.trim()});`
    );
    const result = fn(context, Date, Math, JSON, Number, String, Boolean);
    if (result === undefined || result === null) return "";
    if (typeof result === "string") return result;
    if (typeof result === "boolean") return result ? "Yes" : "No";
    if (typeof result === "number" && !Number.isFinite(result)) return "";
    return String(result);
  } catch {
    return "";
  }
}

/**
 * Resolve a template string:
 * - "{{ expression }}" → evaluated as JavaScript with context and Date/Math/JSON in scope.
 * - "${path}" → context lookup by dot path (e.g. stepKey.fieldKey).
 * Plain text is left as-is.
 */
function resolveContextTemplate(
  data: string,
  context: Record<string, unknown>
): string {
  let out = data;
  // First: replace {{ expression }} with eval result
  out = out.replace(/\{\{([\s\S]*?)\}\}/g, (_, expr: string) =>
    evalTemplateExpression(expr, context)
  );
  // Then: replace ${ path } with context lookup (backward compatible)
  if (/\$\{[^}]+\}/.test(out)) {
    out = out.replace(/\$\{([^}]+)\}/g, (_, path: string) => {
      const val = getContextValue(context, path.trim());
      if (val === undefined || val === null) return "";
      if (typeof val === "string") return val;
      if (typeof val === "boolean") return val ? "Yes" : "No";
      return JSON.stringify(val);
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
                  isCompleted ? "bg-stone-400" : "bg-stone-600"
                }`}
                aria-hidden
              />
            )}
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                isCompleted
                  ? "bg-stone-400 text-stone-900"
                  : isCurrent
                    ? "border-2 border-stone-300 bg-stone-950 text-stone-100 ring-2 ring-stone-400"
                    : "border-2 border-stone-600 bg-stone-950 text-stone-500"
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
  const params = useParams();
  const processId = params.processId as string;
  const [process, setProcess] = useState<ProcessState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, boolean | string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState<string | null>(null);

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
        setProcess(result.process);
        const step = getCurrentStep(result.process);
        const currentProcessStep = getCurrentProcessStepFromState(result.process);
        const stepContext = currentProcessStep
          ? (result.process.context[currentProcessStep.stepKey] as Record<string, unknown>)
          : undefined;
        if (step?.inputs) {
          const context = result.process.context;
          setFormValues((prev) => {
            const next = { ...prev };
            step.inputs?.forEach((inp) => {
              if (inp.readOnly) return;
              if (inp.key in next) return;
              const raw = stepContext?.[inp.key];
              if (raw !== undefined && raw !== null) {
                next[inp.key] = inp.type === "bool" ? Boolean(raw) : String(raw);
                return;
              }
              if (inp.defaultValue != null && inp.defaultValue !== "") {
                const resolved = resolveContextTemplate(inp.defaultValue, context);
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
  }, [processId, fetchProcess]);

  // Poll when current step is non-user (waiting for agent/backend)
  const step = process ? getCurrentStep(process) : null;
  useEffect(() => {
    if (loading || error || !process || !step) return;
    if (step.type === "input") return;

    const t = setInterval(async () => {
      const result = await fetchProcess();
      if ("process" in result) setProcess(result.process ?? null);
      if ("error" in result) setError(result.error ?? null);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [loading, error, process?.processId, step?.key, processId, fetchProcess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentProcessStep = process ? getCurrentProcessStepFromState(process) : null;
    if (!step?.inputs?.length || submitting || !process || !currentProcessStep) return;
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {};
      step.inputs.forEach((inp) => {
        if (inp.readOnly) return;
        if (inp.type === "bool") {
          payload[inp.key] = formValues[inp.key] ?? false;
        } else if (inp.type === "number") {
          const v = formValues[inp.key];
          if (v === undefined || v === "") payload[inp.key] = "";
          else {
            const n = Number(v);
            payload[inp.key] = Number.isFinite(n) ? n : String(v);
          }
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
        const nextProcess = result.process!;
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
            className="h-8 w-8 animate-spin rounded-full border-2 border-stone-500 border-t-stone-300"
            aria-hidden
          />
          <p className="text-stone-400">Loading…</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <p className="text-red-400">{error}</p>
        <Link
          href="/"
          className="mt-4 inline-block text-stone-400 hover:text-stone-300"
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
        <Link href="/" className="text-stone-400 hover:text-stone-300">
          ← Back to home
        </Link>
        <StepProgress
          steps={process.template.steps.map((s) => ({ key: s.key, title: s.title }))}
          currentStepIndex={currentStepIndex + 1}
        />
        <div className="flex flex-col items-center gap-4">
          <div
            className="h-10 w-10 animate-spin rounded-full border-2 border-stone-500 border-t-stone-300"
            aria-hidden
          />
          <p className="text-stone-400">Please wait…</p>
          <p className="text-sm text-stone-500">{nextStepTitle}</p>
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
            Boolean(evaluate(process.context, vc.visibleExpression))) &&
          shouldShowViewControl(vc.data, process.context)
      );
    const showResultViewControls = resolvedResultViewControls.length > 0;
    const showFallbackResult = hasResult && !showResultViewControls;

    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <Link href="/" className="text-stone-400 hover:text-stone-300">
          ← Back to home
        </Link>
        <StepProgress
          steps={process.template.steps.map((s) => ({ key: s.key, title: s.title }))}
          currentStepIndex={-1}
        />
        <h1 className="text-2xl font-semibold text-stone-100">
          Process completed
        </h1>
        <p className="mt-1 text-stone-400">
          This process has finished.
        </p>
        {showResultViewControls && (
          <section className="mt-8 space-y-4">
            <h2 className="text-sm font-medium uppercase tracking-wider text-stone-500">
              Result
            </h2>
            {resolvedResultViewControls.map((vc, i) => {
              const display = resolveContextTemplate(vc.data, process.context);
              return (
                <div
                  key={`${vc.data}-${vc.title}-${i}`}
                  className="rounded-xl border border-stone-700 bg-stone-900/50 px-4 py-4"
                >
                  <div className="text-sm font-medium text-stone-400">{vc.title}</div>
                  <div
                    className="mt-2 text-stone-200 [&_a]:text-sky-400 [&_a:hover]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2"
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
            <h2 className="text-sm font-medium uppercase tracking-wider text-stone-500">
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
                  className="rounded-xl border border-stone-700 bg-stone-900/50 px-4 py-4"
                >
                  <div className="text-sm font-medium text-stone-400">{label}</div>
                  <pre className="mt-2 whitespace-pre-wrap font-sans text-sm text-stone-200">
                    {text}
                  </pre>
                </div>
              );
            })}
          </section>
        )}
        <Link
          href="/"
          className="mt-8 inline-block rounded-lg bg-stone-600 px-4 py-2 text-stone-100 hover:bg-stone-500"
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
        <Link href="/" className="text-stone-400 hover:text-stone-300">
          ← Back to home
        </Link>
        <StepProgress
          steps={process.template.steps.map((s) => ({ key: s.key, title: s.title }))}
          currentStepIndex={currentStepIndex}
        />
        <p className="mt-6 text-stone-200">{confirmationMessage}</p>
        <Link
          href="/"
          className="mt-8 inline-block text-stone-500 hover:text-stone-400"
        >
          Back to home
        </Link>
      </main>
    );
  }

  if ((!isUserStep || !canAct) && step && process && !isProcessCompleted) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <Link href="/" className="text-stone-400 hover:text-stone-300">
          ← Back to home
        </Link>
        <StepProgress
          steps={process.template.steps.map((s) => ({ key: s.key, title: s.title }))}
          currentStepIndex={currentStepIndex}
        />
        <div className="flex flex-col items-center gap-4">
          <div
            className="h-10 w-10 animate-spin rounded-full border-2 border-stone-500 border-t-stone-300"
            aria-hidden
          />
          <p className="text-stone-400">Please wait…</p>
          {!isUserStep && (
            <p className="text-sm text-stone-500">{step.title}</p>
          )}
        </div>
      </main>
    );
  }

  const evaluationContext = process
    ? (() => {
        const base = { ...process.context };
        if (step?.key && Object.keys(formValues).length > 0) {
          const current = (base[step.key] as Record<string, unknown>) ?? {};
          base[step.key] = { ...current, ...formValues };
        }
        return base;
      })()
    : {};

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/" className="text-stone-400 hover:text-stone-300">
        ← Back to home
      </Link>
      {process && (
        <StepProgress
          steps={process.template.steps.map((s) => ({ key: s.key, title: s.title }))}
          currentStepIndex={currentStepIndex}
        />
      )}
      <h1 className="mt-6 text-2xl font-semibold text-stone-100">{step?.title}</h1>
      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        {step?.inputs
          ?.filter(
            (inp) =>
              (!inp.visibleExpression ||
                Boolean(process && evaluate(evaluationContext, inp.visibleExpression))) &&
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
                className="rounded-xl border border-stone-700 bg-stone-900/50 px-4 py-4"
              >
                <div className="text-sm font-medium text-stone-400">{inp.title}</div>
                <div
                  className="mt-2 text-stone-200 [&_a]:text-sky-400 [&_a:hover]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2"
                  aria-readonly
                  dangerouslySetInnerHTML={{
                    __html: process
                      ? resolveContextTemplate(inp.defaultValue ?? "", evaluationContext)
                      : inp.defaultValue ?? "",
                  }}
                />
              </div>
            ) : (
          <div
            key={inp.key}
            className="rounded-xl border border-stone-700 bg-stone-900/50 px-4 py-4"
          >
            {inp.type === "bool" ? (
              <label className="flex cursor-pointer items-center justify-between gap-4">
                <span className="text-sm font-medium leading-snug text-stone-200">
                  {inp.title}
                </span>
                <input
                  type="checkbox"
                  checked={Boolean(formValues[inp.key])}
                  onChange={(e) =>
                    setFormValues((prev) => ({
                      ...prev,
                      [inp.key]: e.target.checked,
                    }))
                  }
                  className="sr-only"
                />
                <span
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border transition-colors ${
                    formValues[inp.key]
                      ? "border-stone-500 bg-stone-500"
                      : "border-stone-600 bg-stone-800"
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
                  className="block text-sm font-medium text-stone-300"
                >
                  {inp.title}
                </label>
                <select
                  id={inp.key}
                  value={String(formValues[inp.key] ?? "")}
                  onChange={(e) =>
                    setFormValues((prev) => ({
                      ...prev,
                      [inp.key]: e.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2.5 text-stone-200 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
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
                  className="block text-sm font-medium text-stone-300"
                >
                  {inp.title}
                </label>
                <input
                  id={inp.key}
                  type="number"
                  value={String(formValues[inp.key] ?? "")}
                  onChange={(e) =>
                    setFormValues((prev) => ({
                      ...prev,
                      [inp.key]: e.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2.5 text-stone-200 placeholder-stone-500 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
                />
              </>
            ) : inp.type === "string-multiline" ? (
              <>
                <label
                  htmlFor={inp.key}
                  className="block text-sm font-medium text-stone-300"
                >
                  {inp.title}
                </label>
                <textarea
                  id={inp.key}
                  rows={4}
                  value={String(formValues[inp.key] ?? "")}
                  onChange={(e) =>
                    setFormValues((prev) => ({
                      ...prev,
                      [inp.key]: e.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2.5 text-stone-200 placeholder-stone-500 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
                />
              </>
            ) : inp.type === "datetime" ? (
              <>
                <label
                  htmlFor={inp.key}
                  className="block text-sm font-medium text-stone-300"
                >
                  {inp.title}
                </label>
                <DateTimePicker
                  id={inp.key}
                  value={String(formValues[inp.key] ?? "")}
                  onChange={(v) =>
                    setFormValues((prev) => ({
                      ...prev,
                      [inp.key]: v,
                    }))
                  }
                  className="mt-2"
                />
              </>
            ) : (
              <>
                <label
                  htmlFor={inp.key}
                  className="block text-sm font-medium text-stone-300"
                >
                  {inp.title}
                </label>
                <input
                  id={inp.key}
                  type="text"
                  value={String(formValues[inp.key] ?? "")}
                  onChange={(e) =>
                    setFormValues((prev) => ({
                      ...prev,
                      [inp.key]: e.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2.5 text-stone-200 placeholder-stone-500 focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
                />
              </>
            )}
          </div>
            )
          )}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-stone-600 px-4 py-2 text-stone-100 hover:bg-stone-500 disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Continue"}
        </button>
      </form>
    </main>
  );
}
