"use client";

import Link from "next/link";

function TemplatesIcon() {
  return (
    <svg
      className="h-16 w-16 text-amber-400/90"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M13 3v6a1 1 0 01-1 1H6"
      />
    </svg>
  );
}

function ProcessesIcon() {
  return (
    <svg
      className="h-16 w-16 text-emerald-400/90"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M4 6h16M4 10h16M4 14h16M4 18h10"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.2}
        d="M14 18l3-3-3-3"
      />
    </svg>
  );
}

export default function HomePage() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-6 py-12">
      <div className="grid w-full max-w-3xl grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2">
        <Link
          href="/templates"
          className="group flex flex-col items-center justify-center rounded-2xl border-2 border-stone-700 bg-stone-900/80 p-12 shadow-xl transition hover:border-amber-500/50 hover:bg-stone-800/80 hover:shadow-amber-500/5 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:ring-offset-2 focus:ring-offset-stone-950"
        >
          <span className="mb-6 transition group-hover:scale-105">
            <TemplatesIcon />
          </span>
          <h2 className="text-xl font-semibold tracking-tight text-stone-100">
            Templates
          </h2>
          <p className="mt-2 max-w-[220px] text-center text-sm text-stone-400">
            Create and edit templates, start new processes
          </p>
          <span className="mt-6 text-sm font-medium text-amber-400 opacity-0 transition group-hover:opacity-100">
            Open templates →
          </span>
        </Link>

        <Link
          href="/processes"
          className="group flex flex-col items-center justify-center rounded-2xl border-2 border-stone-700 bg-stone-900/80 p-12 shadow-xl transition hover:border-emerald-500/50 hover:bg-stone-800/80 hover:shadow-emerald-500/5 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 focus:ring-offset-stone-950"
        >
          <span className="mb-6 transition group-hover:scale-105">
            <ProcessesIcon />
          </span>
          <h2 className="text-xl font-semibold tracking-tight text-stone-100">
            Processes
          </h2>
          <p className="mt-2 max-w-[220px] text-center text-sm text-stone-400">
            View running and completed processes, check state
          </p>
          <span className="mt-6 text-sm font-medium text-emerald-400 opacity-0 transition group-hover:opacity-100">
            Open processes →
          </span>
        </Link>
      </div>
    </div>
  );
}
