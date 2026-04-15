"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { authFetch } from "@/lib/auth-client";
import { useMe } from "@/hooks/use-me";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import type { Process } from "@/entities/process";

function formatRelativeTime(iso: string): string {
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

function welcomeFirstName(email: string | undefined): string {
  if (!email) return "there";
  const local = email.split("@")[0] ?? "";
  const part = local.split(/[._-]/)[0] ?? local;
  if (!part) return "there";
  return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
}

function processIdShort(id: string): string {
  return id.length > 4 ? `#${id.slice(-4)}` : `#${id}`;
}

function avatarHue(seed: string): { bg: string; text: string } {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i) * 17) % 360;
  return {
    bg: `hsl(${h} 65% 92%)`,
    text: `hsl(${h} 45% 32%)`,
  };
}

export default function HomePage() {
  const { me, loading: meLoading } = useMe();
  const [processes, setProcesses] = useState<Process[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const canTemplates = hasPermission(me?.permissions, PERMISSIONS.TEMPLATES_READ);
  const canWriteTemplates = hasPermission(me?.permissions, PERMISSIONS.TEMPLATES_WRITE);
  const canReadProcesses = hasPermission(me?.permissions, PERMISSIONS.PROCESSES_READ);

  const loadProcesses = useCallback(async () => {
    if (!canReadProcesses) {
      setProcesses([]);
      return;
    }
    setLoadError(null);
    try {
      const res = await authFetch("/api/process");
      if (!res.ok) {
        setProcesses([]);
        if (res.status === 403) return;
        throw new Error("Failed to load processes");
      }
      const data = (await res.json()) as Process[];
      setProcesses(data);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load activity");
      setProcesses([]);
    }
  }, [canReadProcesses]);

  useEffect(() => {
    if (meLoading) return;
    void loadProcesses();
  }, [meLoading, loadProcesses]);

  const weekAgo = useMemo(() => Date.now() - 7 * 24 * 60 * 60 * 1000, []);

  const stats = useMemo(() => {
    const list = processes ?? [];
    const active = list.filter((p) => p.status === "running").length;
    const completedWeek = list.filter(
      (p) => p.status === "completed" && new Date(p.updatedAt).getTime() >= weekAgo
    ).length;
    const completed = list.filter((p) => p.status === "completed");
    let avgDays = 0;
    if (completed.length > 0) {
      const sumMs = completed.reduce((acc, p) => {
        const a = new Date(p.startedAt).getTime();
        const b = new Date(p.updatedAt).getTime();
        return acc + Math.max(0, b - a);
      }, 0);
      avgDays = sumMs / completed.length / (24 * 60 * 60 * 1000);
    }
    const avgLabel =
      completed.length === 0 ? "—" : avgDays < 1 ? "<1d" : `${Math.round(avgDays)}d`;

    return {
      active,
      awaitingSignoff: 0,
      completedWeek,
      avgLabel,
    };
  }, [processes, weekAgo]);

  const recentActivity = useMemo(() => {
    const list = processes ?? [];
    const sorted = [...list].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    return sorted.slice(0, 8).map((p) => {
      const name = p.template?.name ?? p.template?.key ?? "Process";
      const summary =
        p.status === "completed"
          ? `Completed **${name}**`
          : `Updated **${name}**`;
      return {
        id: p.processId,
        summary,
        time: formatRelativeTime(p.updatedAt),
        seed: p.processId,
      };
    });
  }, [processes]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-surface-900">Dashboard</h1>
          <p className="mt-1 text-surface-500">
            Welcome back{me?.email ? `, ${welcomeFirstName(me.email)}` : ""}
          </p>
        </div>
        {canWriteTemplates && (
          <Link
            href="/templates/editor/new"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Template
          </Link>
        )}
      </header>

      {loadError && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {loadError}
        </p>
      )}

      <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active Processes"
          value={canReadProcesses ? String(stats.active) : "—"}
          icon="pulse"
          iconBg="bg-primary-100"
          iconColor="text-primary-600"
        />
        <StatCard
          label="Awaiting My Sign-off"
          value={String(stats.awaitingSignoff)}
          icon="hourglass"
          iconBg="bg-orange-50"
          iconColor="text-orange-600"
        />
        <StatCard
          label="Completed This Week"
          value={canReadProcesses ? String(stats.completedWeek) : "—"}
          icon="check"
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <StatCard
          label="Avg. Completion Time"
          value={canReadProcesses ? stats.avgLabel : "—"}
          icon="trend"
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
        />
      </section>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
        <section>
          <h2 className="text-base font-semibold text-surface-900">My Action Items</h2>
          <div className="mt-3 flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-surface-300 bg-white p-8 shadow-card">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary-600">
              <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </span>
            <p className="mt-4 text-center font-medium text-surface-800">You&apos;re all caught up</p>
            <p className="mt-1 max-w-xs text-center text-sm text-surface-500">
              No processes need your attention right now
            </p>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-surface-900">Recent Activity</h2>
            {canReadProcesses && recentActivity.length > 0 && (
              <Link href="/processes" className="text-sm font-medium text-primary-600 hover:text-primary-700">
                View all
              </Link>
            )}
          </div>
          <div className="mt-3 overflow-hidden rounded-xl border border-surface-200 bg-white shadow-card">
            {!canReadProcesses && (
              <p className="p-6 text-sm text-surface-500">
                You don&apos;t have permission to view process activity.
              </p>
            )}
            {canReadProcesses && meLoading && (
              <p className="p-6 text-sm text-surface-500">Loading…</p>
            )}
            {canReadProcesses && !meLoading && recentActivity.length === 0 && (
              <p className="p-6 text-sm text-surface-500">No recent activity yet.</p>
            )}
            {canReadProcesses && !meLoading && recentActivity.length > 0 && (
              <ul className="divide-y divide-surface-100">
                {recentActivity.map((item) => {
                  const { bg, text } = avatarHue(item.seed);
                  const initials = item.seed.slice(0, 2).toUpperCase();
                  return (
                    <li key={item.id}>
                      <Link
                        href={`/process/${item.id}`}
                        className="flex gap-3 px-4 py-3 transition hover:bg-surface-50"
                      >
                        <span
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                          style={{ backgroundColor: bg, color: text }}
                        >
                          {initials}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-surface-800">
                            <ActivitySummary text={item.summary} />
                          </p>
                          <p className="mt-0.5 text-xs text-surface-400">
                            {processIdShort(item.id)} · {item.time}
                          </p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>

      {!meLoading && !canTemplates && (
        <p className="mt-10 text-center text-sm text-surface-500">
          <Link href="/processes" className="font-medium text-primary-600 hover:text-primary-700">
            Go to Active Processes
          </Link>
        </p>
      )}
    </div>
  );
}

function ActivitySummary({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/);
  if (parts.length === 1) return <>{text}</>;
  const out: ReactNode[] = [];
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 1) {
      out.push(
        <strong key={i} className="font-semibold text-surface-900">
          {parts[i]}
        </strong>
      );
    } else if (parts[i]) {
      out.push(<span key={i}>{parts[i]}</span>);
    }
  }
  return <>{out}</>;
}

function StatCard({
  label,
  value,
  icon,
  iconBg,
  iconColor,
}: {
  label: string;
  value: string;
  icon: "pulse" | "hourglass" | "check" | "trend";
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="rounded-xl border border-surface-200 bg-white p-5 shadow-card">
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBg} ${iconColor}`}>
          <StatIcon name={icon} />
        </span>
        <div className="min-w-0">
          <p className="text-2xl font-semibold tabular-nums text-surface-900">{value}</p>
          <p className="mt-0.5 text-sm text-surface-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function StatIcon({ name }: { name: "pulse" | "hourglass" | "check" | "trend" }) {
  const cls = "h-5 w-5";
  if (name === "pulse") {
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    );
  }
  if (name === "hourglass") {
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    );
  }
  if (name === "check") {
    return (
      <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
      </svg>
    );
  }
  return (
    <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  );
}
