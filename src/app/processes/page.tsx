"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/lib/auth-client";
import type { Process } from "@/entities/process";
import type { Template } from "@/entities/template";

export default function ProcessesPage() {
  const router = useRouter();
  const [processes, setProcesses] = useState<Process[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingKey, setStartingKey] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);

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

  if (loading) {
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

  const processesByUpdated = [...processes].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 lg:px-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-surface-900">Active Processes</h1>
        <p className="mt-1 text-surface-500">Start instances and track running work</p>
      </header>

      <section className="mb-8 rounded-xl border border-surface-200 bg-white p-6 shadow-card">
        <div>
          <h2 className="text-lg font-semibold text-surface-900">Start new process</h2>
          <p className="mt-1 text-sm text-surface-500">
            Choose a template to create a new process instance.
          </p>
        </div>
        {startError && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {startError}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          {templates.map((t) => {
            const isStarting = startingKey === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => startProcess(t.key)}
                disabled={startingKey !== null}
                className="flex min-w-[160px] items-center justify-center rounded-xl border border-surface-200 bg-surface-50 px-5 py-4 transition hover:border-primary-300 hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isStarting ? (
                  <>
                    <span
                      className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-surface-300 border-t-primary-600"
                      aria-hidden
                    />
                    <span className="text-sm font-medium text-surface-700">Starting…</span>
                  </>
                ) : (
                  <span className="truncate font-medium text-surface-900">{t.name ?? t.key}</span>
                )}
              </button>
            );
          })}
        </div>
        {templates.length === 0 && (
          <p className="mt-4 text-sm text-surface-500">
            No templates available. Create one in the Templates section.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-surface-200 bg-white p-6 shadow-card">
        <h2 className="text-sm font-semibold text-surface-600">All processes</h2>
        {processesByUpdated.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {processesByUpdated.map((p) => (
              <li key={p.processId}>
                <Link
                  href={`/process/${p.processId}`}
                  className="block rounded-lg border border-surface-200 bg-surface-50/50 px-4 py-3 transition hover:border-surface-300 hover:bg-white"
                >
                  <span className="font-medium text-surface-900">
                    {p.template?.name ?? p.template?.key ?? p.processId}
                  </span>
                  <span className="mt-1 block text-xs text-surface-500">
                    Last updated {formatDate(p.updatedAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-surface-500">No processes yet. Start one above.</p>
        )}
      </section>
    </div>
  );
}
