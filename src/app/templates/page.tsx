"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { authFetch } from "@/lib/auth-client";
import { useMe } from "@/hooks/use-me";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import type { Template } from "@/entities/template";

function uniqueCloneKey(baseKey: string, existingKeys: string[]): string {
  const set = new Set(existingKeys);
  if (!set.has(`${baseKey}-copy`)) return `${baseKey}-copy`;
  let n = 2;
  while (set.has(`${baseKey}-copy-${n}`)) n++;
  return `${baseKey}-copy-${n}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

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
      if ((e.target as HTMLElement).closest?.('button[aria-label="Actions"]')) return;
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

export default function TemplatesPage() {
  const router = useRouter();
  const { me, loading: meLoading } = useMe();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);
  const [cloningKey, setCloningKey] = useState<string | null>(null);
  const [cloneError, setCloneError] = useState<string | null>(null);

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

  if (meLoading || (me && !hasPermission(me.permissions, PERMISSIONS.TEMPLATES_READ)) || loading) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-center gap-4 px-6 py-24">
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
    <div className="mx-auto max-w-5xl px-6 py-8 lg:px-8">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-surface-900">Process Templates</h1>
          <p className="mt-1 text-surface-500">Browse and manage your process templates</p>
        </div>
        <Link
          href="/templates/editor/new"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Template
        </Link>
      </header>

      <section className="rounded-xl border border-surface-200 bg-white p-6 shadow-card">
        {cloneError && (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {cloneError}
          </p>
        )}
        <ul className="space-y-2">
          {templates.map((t) => (
            <li
              key={t.key}
              role="button"
              tabIndex={0}
              onClick={() => router.push(`/templates/editor/${t.key}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  router.push(`/templates/editor/${t.key}`);
                }
              }}
              className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-surface-200 bg-surface-50/50 px-4 py-3 transition hover:border-surface-300 hover:bg-white"
            >
              <div>
                <span className="font-medium text-surface-900">{t.name ?? t.key}</span>
                <span className="mt-1 block text-xs text-surface-500">
                  Last updated {t.updatedAt ? formatDate(t.updatedAt) : "—"}
                </span>
              </div>
              <div
                className="relative shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuKey((k) => (k === t.key ? null : t.key));
                  }}
                  className="rounded p-1.5 text-surface-500 hover:bg-surface-200 hover:text-surface-800"
                  aria-label="Actions"
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
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
