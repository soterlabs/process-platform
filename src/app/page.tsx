import Link from "next/link";
import { SignOutLink } from "./sign-out-link";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-100">Process Platform</h1>
        <SignOutLink />
      </div>
      <p className="mt-2 text-stone-400">
        JSON-defined processes with state in your DB. Create an instance from a template key, get state, update steps, complete steps.
      </p>
      <nav className="mt-10 flex flex-col gap-3">
        <Link
          href="/start/new-halo"
          className="rounded-lg border border-stone-600 bg-stone-800/50 px-4 py-3 text-stone-200 transition hover:border-stone-500 hover:bg-stone-800"
        >
          Start halo flow
        </Link>
        <Link
          href="/templates/editor/new-halo"
          className="rounded-lg border border-stone-600 bg-stone-800/50 px-4 py-3 text-stone-200 transition hover:border-stone-500 hover:bg-stone-800"
        >
          Edit halo flow (template editor)
        </Link>
        <Link
          href="/templates/editor/new"
          className="rounded-lg border border-stone-600 bg-stone-800/50 px-4 py-3 text-stone-200 transition hover:border-stone-500 hover:bg-stone-800"
        >
          New template
        </Link>
        <Link
          href="/docs"
          className="rounded-lg border border-stone-600 bg-stone-800/50 px-4 py-3 text-stone-200 transition hover:border-stone-500 hover:bg-stone-800"
        >
          API docs (Swagger)
        </Link>
      </nav>
    </main>
  );
}
