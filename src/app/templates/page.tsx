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
      className="absolute right-0 top-full z-50 mt-1 min-w-[160px] rounded-lg border border-stone-600 bg-stone-800 py-1 shadow-xl"
    >
      <Link
        href={`/templates/editor/${templateKey}`}
        className="block px-4 py-2 text-sm text-stone-200 hover:bg-stone-700 hover:text-white"
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
        className="block w-full px-4 py-2 text-left text-sm text-stone-200 hover:bg-stone-700 hover:text-white disabled:opacity-50"
      >
        {isCloning ? "Cloning…" : "Clone"}
      </button>
      <div className="my-1 border-t border-stone-600" role="separator" />
      <Link
        href={`/start/${templateKey}`}
        className="block px-4 py-2 text-sm text-stone-200 hover:bg-stone-700 hover:text-white"
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
          className="h-10 w-10 animate-spin rounded-full border-2 border-stone-500 border-t-stone-300"
          aria-hidden
        />
        <p className="text-stone-400">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12">
        <p className="text-red-400">{error}</p>
        <Link href="/" className="mt-4 inline-block text-stone-400 hover:text-stone-300">
          ← Home
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-100">
          Templates
        </h1>
        <p className="mt-1 text-stone-400">
          Start a process from a template or create and edit templates.
        </p>
      </div>

      <section className="rounded-xl border border-stone-700/80 bg-stone-900/50 p-6">
        {cloneError && (
          <p className="mb-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">
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
              className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-stone-700/60 bg-stone-800/40 px-4 py-3 transition hover:border-stone-600 hover:bg-stone-800/60"
            >
              <div>
                <span className="font-medium text-stone-200">
                  {t.name ?? t.key}
                </span>
                <span className="mt-1 block text-xs text-stone-500">
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
                  className="rounded p-1.5 text-stone-400 hover:bg-stone-600 hover:text-stone-200"
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
        <Link
          href="/templates/editor/new"
          className="mt-4 inline-flex items-center rounded-lg border border-stone-600 bg-stone-800/50 px-4 py-2.5 text-sm font-medium text-stone-200 transition hover:border-stone-500 hover:bg-stone-800"
        >
          New template
        </Link>
      </section>

      <div className="mt-10">
        <Link href="/" className="text-sm text-stone-500 hover:text-stone-400">
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
