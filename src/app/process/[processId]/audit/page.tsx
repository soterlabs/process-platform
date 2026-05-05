"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { authFetch } from "@/lib/auth-client";

export default function ProcessAuditStatePage() {
  const params = useParams();
  const processId = params.processId as string;
  const [jsonText, setJsonText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await authFetch(`/api/process/${encodeURIComponent(processId)}/audit`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError((data.error as string) ?? `Request failed (${res.status})`);
          setJsonText(null);
          return;
        }
        setJsonText(JSON.stringify(data, null, 2));
      } catch {
        if (!cancelled) setError("Failed to load process state");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [processId]);

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <Link
        href={`/process/${encodeURIComponent(processId)}`}
        className="text-sm text-surface-500 hover:text-surface-700"
      >
        ← Back to process
      </Link>
      <h1 className="mt-6 text-xl font-semibold text-surface-900">
        Process state (audit)
      </h1>
      <p className="mt-1 text-sm text-surface-500">
        Full persisted state for process{" "}
        <span className="font-mono text-surface-700">{processId}</span>.
      </p>

      {loading && (
        <div className="mt-8 flex items-center gap-3 text-surface-500">
          <div
            className="h-6 w-6 animate-spin rounded-full border-2 border-surface-300 border-t-primary-600"
            aria-hidden
          />
          Loading…
        </div>
      )}

      {error && !loading && (
        <p className="mt-8 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {jsonText !== null && !loading && !error && (
        <div className="mt-8 space-y-3">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void navigator.clipboard.writeText(jsonText)}
              className="rounded-lg border border-surface-300 bg-white px-3 py-1.5 text-xs font-medium text-surface-800 hover:bg-surface-100"
            >
              Copy JSON
            </button>
          </div>
          <pre className="max-h-[min(70vh,48rem)] overflow-auto rounded-xl border border-surface-200 bg-surface-50 p-4 font-mono text-xs leading-relaxed text-surface-900">
            {jsonText}
          </pre>
        </div>
      )}
    </main>
  );
}
