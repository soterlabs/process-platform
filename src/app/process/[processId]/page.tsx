"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Process } from "@/entities/process";
import { authFetch } from "@/lib/auth-client";
import { getContextViewForEvaluation } from "@/services/template-helpers";
import { evaluate } from "@/services/expression-service";

type StepInput = {
  key: string;
  type: "bool" | "string" | "dropdown";
  title: string;
  visibleExpression?: string;
  values?: string[];
};

type ViewControl = {
  key: string;
  title: string;
  visibleExpression?: string;
};

type CurrentStep = {
  key: string;
  title: string;
  type: string;
  inputs?: StepInput[];
  viewControls?: ViewControl[];
  nextStepKey: string | null;
};

type ProcessState = {
  processId: string;
  template: { steps: CurrentStep[] };
  steps: { id: string; processId?: string; stepKey: string }[];
  context: Record<string, unknown>;
  result?: Record<string, unknown>;
  status: string;
  /** True if the current user may complete/update the current step (from GET). */
  canActOnCurrentStep?: boolean;
};

const POLL_INTERVAL_MS = 3000;

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
          ? (result.process.context[currentProcessStep.id] as Record<string, unknown>)
          : undefined;
        if (step?.inputs) {
          setFormValues((prev) => {
            const next = { ...prev };
            step.inputs?.forEach((inp) => {
              if (inp.key in next) return;
              const raw = stepContext?.[inp.key];
              next[inp.key] =
                raw === undefined || raw === null
                  ? inp.type === "bool"
                    ? false
                    : ""
                  : (inp.type === "bool" ? Boolean(raw) : String(raw));
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
        payload[inp.key] = formValues[inp.key] ?? (inp.type === "bool" ? false : "");
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
      const result = await fetchProcess();
      if ("process" in result) setProcess(result.process ?? null);
      else if ("error" in result) setError(result.error ?? null);
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

  const noCurrentStep = process?.steps.length === 0;
  const currentStepIndex = process ? getCurrentStepIndex(process) : 0;

  // While submitting (e.g. right after Continue), show waiting indicator immediately
  if (submitting && process) {
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

  if (noCurrentStep && process) {
    const contextView = getContextViewForEvaluation(process as Process);
    const resultData =
      process.result && Object.keys(process.result).length > 0
        ? process.result
        : Object.fromEntries(
            process.template.steps
              .filter((s) => s.type === "request")
              .map((s) => [s.key, contextView[s.key]])
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
        {hasResult && (
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

  if (!isUserStep && step && process) {
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
          <p className="text-sm text-stone-500">{step.title}</p>
        </div>
      </main>
    );
  }

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
      {isUserStep && !canAct && (
        <p className="mt-6 rounded-lg border border-amber-800/50 bg-amber-950/30 px-4 py-3 text-amber-200">
          You don&apos;t have permission to complete this step. Please wait for the process to be moved along.
        </p>
      )}
      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        {step?.viewControls
          ?.filter(
            (vc) =>
              !vc.visibleExpression ||
              Boolean(
                process &&
                  evaluate(
                    getContextViewForEvaluation(process as Process),
                    vc.visibleExpression
                  )
              )
          )
          .map((vc) => {
            const contextView = process
              ? getContextViewForEvaluation(process as Process)
              : {};
            const dot = vc.key.indexOf(".");
            const stepKey = dot >= 0 ? vc.key.slice(0, dot) : "";
            const fieldKey = dot >= 0 ? vc.key.slice(dot + 1) : vc.key;
            const stepData = contextView[stepKey] as Record<string, unknown> | undefined;
            const value = stepData?.[fieldKey];
            const display =
              value === undefined || value === null
                ? "—"
                : typeof value === "string"
                  ? value
                  : typeof value === "boolean"
                    ? value
                      ? "Yes"
                      : "No"
                    : JSON.stringify(value);
            return (
              <div
                key={vc.key}
                className="rounded-xl border border-stone-700 bg-stone-900/50 px-4 py-4"
              >
                <div className="text-sm font-medium text-stone-400">{vc.title}</div>
                <div className="mt-2 text-stone-200" aria-readonly>
                  {display}
                </div>
              </div>
            );
          })}
        {step?.inputs
          ?.filter(
            (inp) =>
              !inp.visibleExpression ||
              Boolean(
                process &&
                  evaluate(
                    getContextViewForEvaluation(process as Process),
                    inp.visibleExpression
                  )
              )
          )
          .map((inp) => (
          <div
            key={inp.key}
            className={`rounded-xl border border-stone-700 bg-stone-900/50 px-4 py-4 ${!canAct ? "pointer-events-none opacity-70" : ""}`}
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
        ))}
        <button
          type="submit"
          disabled={submitting || !canAct}
          className="rounded-lg bg-stone-600 px-4 py-2 text-stone-100 hover:bg-stone-500 disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Continue"}
        </button>
      </form>
    </main>
  );
}
