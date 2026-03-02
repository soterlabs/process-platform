"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { authFetch } from "@/lib/auth-client";

export default function StartTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const templateKey = params.templateKey as string;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      try {
        const res = await authFetch("/api/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ templateKey }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? "Failed to start process");
          return;
        }
        router.replace(`/process/${data.processId}`);
      } catch (e) {
        if (!cancelled) setError("Failed to start process");
      }
    }
    start();
    return () => {
      cancelled = true;
    };
  }, [templateKey, router]);

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

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <div className="flex flex-col items-center gap-4">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-stone-500 border-t-stone-300"
          aria-hidden
        />
        <p className="text-stone-400">Starting process…</p>
      </div>
    </main>
  );
}
