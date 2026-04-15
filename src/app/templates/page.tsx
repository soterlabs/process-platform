"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { authFetch } from "@/lib/auth-client";
import { useMe } from "@/hooks/use-me";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import type { Process } from "@/entities/process";
import type { Template, TemplateStatus } from "@/entities/template";

function uniqueCloneKey(baseKey: string, existingKeys: string[]): string {
  const set = new Set(existingKeys);
  if (!set.has(`${baseKey}-copy`)) return `${baseKey}-copy`;
  let n = 2;
  while (set.has(`${baseKey}-copy-${n}`)) n++;
  return `${baseKey}-copy-${n}`;
}

function formatShortDate(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function statusOf(t: Template): TemplateStatus {
  const s = t.status;
  if (s === "draft" || s === "archived") return s;
  return "active";
}

function cardDescription(t: Template): string {
  if (t.description?.trim()) return t.description.trim();
  const stepWithTitle = t.steps.find((s) => "title" in s && (s as { title?: string }).title);
  const title = stepWithTitle && "title" in stepWithTitle ? (stepWithTitle as { title: string }).title : null;
  if (title) {
    return `${title} and ${Math.max(0, t.steps.length - 1)} more steps in this workflow.`;
  }
  return `A ${t.steps.length}-step process you can start from the Active Processes page.`;
}

type FilterTab = "all" | TemplateStatus;

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "draft", label: "Draft" },
  { id: "archived", label: "Archived" },
];

function TemplateRowMenu({
  templateKey,
  onClose,
  onClone,
  isCloning,
}: {
  templateKey: string;
  onClose: () => void;
  onClone: (key: string) => void;
  isCloning: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      if ((e.target as HTMLElement).closest?.('button[aria-label="Template actions"]')) return;
      onClose();
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full z-50 mt-1 min-w-[160px] rounded-lg border border-surface-200 bg-white py-1 shadow-lg"
    >
      <Link
        href={`/templates/editor/${templateKey}`}
        className="block px-4 py-2 text-sm text-surface-800 hover:bg-surface-50"
        onClick={onClose}
      >
        Edit
      </Link>
      <button
        type="button"
        onClick={() => {
          onClose();
          onClone(templateKey);
        }}
        disabled={isCloning}
        className="block w-full px-4 py-2 text-left text-sm text-surface-800 hover:bg-surface-50 disabled:opacity-50"
      >
        {isCloning ? "Cloning…" : "Clone"}
      </button>
      <div className="my-1 border-t border-surface-100" role="separator" />
      <Link
        href={`/start/${templateKey}`}
        className="block px-4 py-2 text-sm text-surface-800 hover:bg-surface-50"
        onClick={onClose}
      >
        Start
      </Link>
    </div>
  );
}

function StatusBadge({ status }: { status: TemplateStatus }) {
  const shell: Record<TemplateStatus, string> = {
    active: "border-emerald-200 bg-emerald-50 text-emerald-700",
    draft: "border-amber-200 bg-amber-50 text-amber-800",
    archived: "border-surface-200 bg-surface-100 text-surface-600",
  };
  const dot: Record<TemplateStatus, string> = {
    active: "bg-emerald-500",
    draft: "bg-amber-500",
    archived: "bg-surface-400",
  };
  const label: Record<TemplateStatus, string> = {
    active: "Active",
    draft: "Draft",
    archived: "Archived",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${shell[status]}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot[status]}`} aria-hidden />
      {label[status]}
    </span>
  );
}

export default function TemplatesPage() {
  const router = useRouter();
  const { me, loading: meLoading } = useMe();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [activeByTemplate, setActiveByTemplate] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);
  const [cloningKey, setCloningKey] = useState<string | null>(null);
  const [cloneError, setCloneError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [sortBy, setSortBy] = useState<"updated" | "name">("updated");

  useEffect(() => {
    if (!meLoading && me && !hasPermission(me.permissions, PERMISSIONS.TEMPLATES_READ)) {
      router.replace("/");
    }
  }, [meLoading, me, router]);

  const handleClone = useCallback(
    async (sourceKey: string) => {
      setCloneError(null);
      setCloningKey(sourceKey);
      try {
        const res = await authFetch(`/api/templates/${encodeURIComponent(sourceKey)}`);
        if (!res.ok) throw new Error("Failed to load template");
        const template = (await res.json()) as Template;
        const existingKeys = templates.map((t) => t.key);
        const newKey = uniqueCloneKey(template.key, existingKeys);
        const clone = { ...template, key: newKey, name: (template.name ?? template.key) + " (copy)" };
        const putRes = await authFetch(`/api/templates/${encodeURIComponent(newKey)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(clone),
        });
        if (!putRes.ok) throw new Error("Failed to save clone");
        router.push(`/templates/editor/${newKey}`);
      } catch (e) {
        setCloneError(e instanceof Error ? e.message : "Clone failed");
      } finally {
        setCloningKey(null);
      }
    },
    [templates, router]
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await authFetch("/api/templates");
        if (cancelled) return;
        if (!res.ok) throw new Error("Failed to load templates");
        const t = (await res.json()) as Template[];
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

  useEffect(() => {
    let cancelled = false;
    async function loadCounts() {
      if (!me || !hasPermission(me.permissions, PERMISSIONS.PROCESSES_READ)) {
        setActiveByTemplate({});
        return;
      }
      try {
        const res = await authFetch("/api/process");
        if (cancelled || !res.ok) return;
        const processes = (await res.json()) as Process[];
        const counts: Record<string, number> = {};
        for (const p of processes) {
          if (p.status !== "running") continue;
          const k = p.template?.key;
          if (!k) continue;
          counts[k] = (counts[k] ?? 0) + 1;
        }
        if (!cancelled) setActiveByTemplate(counts);
      } catch {
        if (!cancelled) setActiveByTemplate({});
      }
    }
    if (!meLoading && me) void loadCounts();
    return () => {
      cancelled = true;
    };
  }, [me, meLoading]);

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = templates.filter((t) => {
      if (filterTab !== "all" && statusOf(t) !== filterTab) return false;
      if (!q) return true;
      const name = (t.name ?? t.key).toLowerCase();
      const key = t.key.toLowerCase();
      const desc = cardDescription(t).toLowerCase();
      return name.includes(q) || key.includes(q) || desc.includes(q);
    });
    list = [...list].sort((a, b) => {
      if (sortBy === "name") {
        return (a.name ?? a.key).localeCompare(b.name ?? b.key, undefined, { sensitivity: "base" });
      }
      const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return tb - ta;
    });
    return list;
  }, [templates, search, filterTab, sortBy]);

  const showNewTemplate = hasPermission(me?.permissions, PERMISSIONS.TEMPLATES_READ);

  if (meLoading || (me && !hasPermission(me.permissions, PERMISSIONS.TEMPLATES_READ)) || loading) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-4 px-6 py-24">
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
    <div className="mx-auto max-w-6xl px-6 py-8 lg:px-8">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-surface-900">Process Templates</h1>
          <p className="mt-1 text-surface-500">Browse and manage your process templates</p>
        </div>
        {showNewTemplate && (
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

      {cloneError && (
        <p className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {cloneError}
        </p>
      )}

      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-center xl:gap-6">
        <div className="relative min-w-0 flex-1 xl:max-w-xl">
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
            placeholder="Search templates..."
            className="w-full rounded-lg border border-surface-200 bg-white py-2.5 pl-10 pr-4 text-sm text-surface-900 placeholder:text-surface-400 shadow-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
            aria-label="Search templates"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 xl:flex-1 xl:justify-center">
          {FILTER_TABS.map(({ id, label }) => {
            const active = filterTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setFilterTab(id)}
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

        <div className="relative shrink-0 xl:w-[200px]">
          <label htmlFor="template-sort" className="sr-only">
            Sort templates
          </label>
          <select
            id="template-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "updated" | "name")}
            className="w-full cursor-pointer appearance-none rounded-lg border border-surface-200 bg-white py-2.5 pl-3 pr-10 text-sm font-medium text-surface-800 shadow-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-100"
          >
            <option value="updated">Last Modified</option>
            <option value="name">Name (A–Z)</option>
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

      {filteredSorted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-300 bg-surface-50/80 px-6 py-16 text-center">
          <p className="font-medium text-surface-800">No templates match your filters</p>
          <p className="mt-1 text-sm text-surface-500">
            Try another search, tab, or clear the search box.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredSorted.map((t) => {
            const status = statusOf(t);
            const title = t.name ?? t.key;
            const steps = t.steps.length;
            const activeCount = activeByTemplate[t.key] ?? 0;
            return (
              <li key={t.key} className="relative">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/templates/editor/${t.key}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(`/templates/editor/${t.key}`);
                    }
                  }}
                  className="group flex h-full cursor-pointer flex-col rounded-xl border border-surface-200 bg-white p-5 text-left shadow-card transition hover:border-surface-300 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <StatusBadge status={status} />
                    <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuKey((k) => (k === t.key ? null : t.key));
                        }}
                        className="rounded-md p-1.5 text-surface-400 transition hover:bg-surface-100 hover:text-surface-700 md:opacity-0 md:group-hover:opacity-100"
                        aria-label="Template actions"
                        aria-expanded={openMenuKey === t.key}
                      >
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                        </svg>
                      </button>
                      {openMenuKey === t.key && (
                        <TemplateRowMenu
                          templateKey={t.key}
                          onClose={() => setOpenMenuKey(null)}
                          onClone={handleClone}
                          isCloning={cloningKey === t.key}
                        />
                      )}
                    </div>
                  </div>

                  <h2 className="mt-3 text-lg font-semibold leading-snug text-surface-900">{title}</h2>
                  <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-surface-500">
                    {cardDescription(t)}
                  </p>

                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-surface-100 pt-4 text-xs text-surface-500">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="inline-flex items-center gap-1.5">
                        <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                          />
                        </svg>
                        {steps} {steps === 1 ? "step" : "steps"}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                        {activeCount} active
                      </span>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1.5">
                      <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {formatShortDate(t.updatedAt)}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
