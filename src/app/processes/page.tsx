"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { authFetch } from "@/lib/auth-client";
import type { Process } from "@/entities/process";
import type { Template } from "@/entities/template";
import { getCurrentProcessStep, getStepByKey } from "@/services/template-helpers";

function formatRelativeTime(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const sec = Math.floor(diffMs / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (day >= 30) {
    const month = Math.floor(day / 30);
    return `${month} month${month === 1 ? "" : "s"} ago`;
  }
  if (day >= 1) return `${day} day${day === 1 ? "" : "s"} ago`;
  if (hr >= 1) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  if (min >= 1) return `${min} min ago`;
  return "just now";
}

function shortProcessId(id: string): string {
  return id.length > 4 ? id.slice(-4) : id;
}

type DisplayStatus = "active" | "completed" | "rejected";

function displayStatus(p: Process): DisplayStatus {
  if (p.status === "running") return "active";
  const r = p.result as Record<string, unknown> | undefined;
  if (r?.outcome === "rejected" || r?.status === "rejected") return "rejected";
  if (typeof p.error === "string" && p.error.length > 0) return "rejected";
  return "completed";
}

function progressParts(p: Process): { num: number; den: number; tone: "blue" | "green" | "red" } {
  const den = Math.max(1, p.template.steps.length);
  const st = displayStatus(p);
  const cur = getCurrentProcessStep(p.steps);
  const idx = cur ? p.template.steps.findIndex((s) => s.key === cur.stepKey) : -1;
  const position = idx >= 0 ? idx + 1 : Math.min(p.steps.length, den);

  if (st === "active") {
    return { num: Math.min(position, den), den, tone: "blue" };
  }
  if (st === "rejected") {
    return { num: Math.min(Math.max(1, position), den), den, tone: "red" };
  }
  return { num: den, den, tone: "green" };
}

function currentStepInfo(p: Process): { title: string; at?: string } | null {
  if (p.status !== "running") return null;
  const ps = getCurrentProcessStep(p.steps);
  if (!ps) return null;
  const ts = getStepByKey(p.template, ps.stepKey);
  const title = ts?.title ?? ps.stepKey;
  const at = ps.updatedUTC ?? p.updatedAt;
  return { title, at };
}

type StatusFilter = "all" | DisplayStatus;
type SortKey = "activity-desc" | "activity-asc" | "started-desc" | "started-asc";

export default function ProcessesPage() {
  const router = useRouter();
  const [processes, setProcesses] = useState<Process[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingKey, setStartingKey] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [templateFilter, setTemplateFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("activity-desc");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [pRes, tRes] = await Promise.all([
          authFetch("/api/process"),
          authFetch("/api/process-templates"),
        ]);
        if (cancelled) return;
        if (!pRes.ok) throw new Error("Failed to load processes");
        if (!tRes.ok) throw new Error("Failed to load templates");
        const p = (await pRes.json()) as Process[];
        const t = (await tRes.json()) as Template[];
        setProcesses(p);
        setTemplates(t);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const startProcess = useCallback(
    async (templateKey: string) => {
      setStartError(null);
      setStartingKey(templateKey);
      try {
        const res = await authFetch("/api/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ templateKey }),
        });
        const data = await res.json();
        if (!res.ok) {
          setStartError(data.error ?? "Failed to start process");
          setStartingKey(null);
          return;
        }
        router.push(`/process/${data.processId}`);
      } catch {
        setStartError("Failed to start process");
        setStartingKey(null);
      }
    },
    [router]
  );

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = processes.filter((p) => {
      const ds = displayStatus(p);
      if (statusFilter !== "all" && ds !== statusFilter) return false;
      if (templateFilter !== "all" && p.template.key !== templateFilter) return false;
      if (!q) return true;
      const tName = (p.template.name ?? p.template.key).toLowerCase();
      const pid = p.processId.toLowerCase();
      const cs = currentStepInfo(p);
      const stepText = cs?.title.toLowerCase() ?? "";
      return tName.includes(q) || pid.includes(q) || shortProcessId(p.processId).includes(q) || stepText.includes(q);
    });

    list = [...list].sort((a, b) => {
      const ta = new Date(a.updatedAt).getTime();
      const tb = new Date(b.updatedAt).getTime();
      const sa = new Date(a.startedAt).getTime();
      const sb = new Date(b.startedAt).getTime();
      switch (sortKey) {
        case "activity-desc":
          return tb - ta;
        case "activity-asc":
          return ta - tb;
        case "started-desc":
          return sb - sa;
        case "started-asc":
          return sa - sb;
        default:
          return tb - ta;
      }
    });
    return list;
  }, [processes, search, statusFilter, templateFilter, sortKey]);

  function formatStarted(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  if (loading) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-4 px-6 py-24">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-surface-300 border-t-primary-600"
          aria-hidden
        />
        <p className="text-surface-500">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12">
        <p className="text-red-600">{error}</p>
        <Link href="/" className="mt-4 inline-block text-primary-600 hover:text-primary-700">
          ← Home
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-surface-900">Active Processes</h1>
        <p className="mt-1 text-surface-500">Track running and completed processes</p>
      </header>

      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:gap-4">
        <div className="relative min-w-0 flex-1 xl:max-w-md">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search processes..."
            className="w-full rounded-lg border border-surface-200 bg-white py-2.5 pl-10 pr-4 text-sm text-surface-900 placeholder:text-surface-400 shadow-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
            aria-label="Search processes"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 xl:flex-1 xl:justify-center">
          {(
            [
              ["all", "All"],
              ["active", "Active"],
              ["completed", "Completed"],
              ["rejected", "Rejected"],
            ] as const
          ).map(([id, label]) => {
            const active = statusFilter === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setStatusFilter(id)}
                aria-pressed={active}
                className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "border-primary-200 bg-primary-50 text-primary-700"
                    : "border-surface-200 bg-white text-surface-600 hover:border-surface-300 hover:bg-surface-50"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center xl:shrink-0">
          <div className="relative w-full sm:w-auto">
            <label htmlFor="process-template-filter" className="sr-only">
              Filter by template
            </label>
            <select
              id="process-template-filter"
              value={templateFilter}
              onChange={(e) => setTemplateFilter(e.target.value)}
              className="w-full min-w-[160px] cursor-pointer appearance-none rounded-lg border border-surface-200 bg-white py-2.5 pl-3 pr-10 text-sm font-medium text-surface-800 shadow-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
            >
              <option value="all">All Templates</option>
              {templates.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.name ?? t.key}
                </option>
              ))}
            </select>
            <svg
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          <div className="relative w-full sm:w-auto">
            <label htmlFor="process-sort" className="sr-only">
              Sort processes
            </label>
            <select
              id="process-sort"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="w-full min-w-[160px] cursor-pointer appearance-none rounded-lg border border-surface-200 bg-white py-2.5 pl-3 pr-10 text-sm font-medium text-surface-800 shadow-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
            >
              <option value="activity-desc">Last activity (newest)</option>
              <option value="activity-asc">Last activity (oldest)</option>
              <option value="started-desc">Started (newest)</option>
              <option value="started-asc">Started (oldest)</option>
            </select>
            <svg
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {templates.length > 0 && (
        <div className="mb-8 flex flex-wrap items-center gap-2 border-b border-surface-100 pb-6">
          <span className="text-sm text-surface-500">Start a process:</span>
          {templates.map((t) => {
            const isStarting = startingKey === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => startProcess(t.key)}
                disabled={startingKey !== null}
                className="rounded-full border border-surface-200 bg-white px-3 py-1.5 text-sm font-medium text-surface-800 transition hover:border-primary-300 hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isStarting ? "Starting…" : (t.name ?? t.key)}
              </button>
            );
          })}
          {startError && (
            <span className="text-sm text-red-600" role="alert">
              {startError}
            </span>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-surface-200 bg-white shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-surface-200 bg-surface-50/80">
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-surface-500">
                  Process
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-surface-500">
                  Template
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-surface-500">
                  Current step
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-surface-500">
                  Status
                </th>
                <th className="w-[140px] px-4 py-3 text-xs font-medium uppercase tracking-wide text-surface-500">
                  Progress
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-surface-500">
                  Started
                </th>
                <th className="w-10 px-2 py-3" aria-hidden />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {filteredSorted.map((p) => {
                const ds = displayStatus(p);
                const cs = currentStepInfo(p);
                const prog = progressParts(p);
                const pct = prog.den > 0 ? Math.round((prog.num / prog.den) * 100) : 0;
                const barClass =
                  prog.tone === "blue"
                    ? "bg-primary-500"
                    : prog.tone === "green"
                      ? "bg-emerald-500"
                      : "bg-red-500";
                return (
                  <tr
                    key={p.processId}
                    tabIndex={0}
                    className="cursor-pointer transition hover:bg-surface-50/80 focus:bg-surface-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-200"
                    onClick={() => router.push(`/process/${p.processId}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push(`/process/${p.processId}`);
                      }
                    }}
                  >
                    <td className="px-4 py-4 align-top">
                      <div className="font-semibold text-surface-900">
                        {p.template.name ?? p.template.key}
                      </div>
                      <div className="mt-0.5 font-mono text-xs text-surface-400">
                        #{shortProcessId(p.processId)}
                      </div>
                    </td>
                    <td className="max-w-[180px] px-4 py-4 align-top text-surface-700">
                      <span className="line-clamp-2" title={p.template.key}>
                        {p.template.name ?? p.template.key}
                      </span>
                    </td>
                    <td className="max-w-[200px] px-4 py-4 align-top text-surface-600">
                      {cs ? (
                        <div>
                          <div className="text-surface-800">{cs.title}</div>
                          <div className="mt-1 flex items-center gap-1 text-xs text-surface-400">
                            <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            {formatRelativeTime(cs.at)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-surface-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <StatusPill status={ds} />
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="flex flex-col gap-1.5">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-100">
                          <div className={`h-full rounded-full ${barClass}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs tabular-nums text-surface-500">
                          {prog.num}/{prog.den}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 align-top text-surface-600">
                      {formatStarted(p.startedAt)}
                    </td>
                    <td className="px-2 py-4 align-middle text-surface-300">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredSorted.length === 0 && (
          <div className="px-6 py-16 text-center">
            {processes.length === 0 ? (
              <>
                <p className="font-medium text-surface-800">No processes yet</p>
                <p className="mt-1 text-sm text-surface-500">
                  Start one using the template shortcuts above.
                </p>
              </>
            ) : (
              <>
                <p className="font-medium text-surface-800">No processes match your filters</p>
                <p className="mt-1 text-sm text-surface-500">
                  Try adjusting search, status, or template filters.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: DisplayStatus }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700">
        <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path d="M8 5v14l11-7z" />
        </svg>
        Active
      </span>
    );
  }
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        Completed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-800">
      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
      Rejected
    </span>
  );
}
