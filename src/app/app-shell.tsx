"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMe } from "@/hooks/use-me";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { SignOutLink } from "./sign-out-link";

const PUBLIC_PATHS = ["/login"];

function LogoIcon({ className }: { className?: string }) {
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-white shadow-sm ${className ?? ""}`}
      aria-hidden
    >
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    </span>
  );
}

function NavIcon({ name }: { name: "dashboard" | "templates" | "processes" }) {
  const common = "h-5 w-5 shrink-0";
  if (name === "dashboard") {
    return (
      <svg className={common} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7H4V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 13a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1h-4a1 1 0 01-1-1v-6z"
        />
      </svg>
    );
  }
  if (name === "templates") {
    return (
      <svg className={common} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M6 3v12"
        />
        <circle cx="18" cy="6" r="3" fill="none" strokeWidth={1.5} />
        <circle cx="6" cy="18" r="3" fill="none" strokeWidth={1.5} />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M18 9a9 9 0 0 1-9 9"
        />
      </svg>
    );
  }
  return (
    <svg className={common} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function initialsFromEmail(email: string | undefined): string {
  if (!email) return "?";
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase().slice(0, 2);
  }
  return local.slice(0, 2).toUpperCase() || "?";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { me } = useMe();
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (isPublic) {
    return <>{children}</>;
  }

  const showTemplates = hasPermission(me?.permissions, PERMISSIONS.TEMPLATES_READ);

  const navLinkClass = (active: boolean) =>
    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
      active
        ? "bg-primary-50 text-primary-700"
        : "text-surface-600 hover:bg-surface-100 hover:text-surface-900"
    }`;

  return (
    <div className="flex h-screen min-h-0 overflow-hidden">
      <aside className="flex h-full min-h-0 w-[260px] shrink-0 flex-col overflow-hidden border-r border-surface-200 bg-white">
        <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-surface-100 px-5">
          <LogoIcon />
          <span className="text-lg font-semibold tracking-tight text-surface-900">processOS</span>
        </div>

        <nav
          className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-3"
          aria-label="Main"
        >
          <Link
            href="/"
            className={navLinkClass(pathname === "/")}
          >
            <NavIcon name="dashboard" />
            Dashboard
          </Link>
          {showTemplates && (
            <Link
              href="/templates"
              className={navLinkClass(pathname === "/templates" || pathname.startsWith("/templates/"))}
            >
              <NavIcon name="templates" />
              Templates
            </Link>
          )}
          <Link
            href="/processes"
            className={navLinkClass(pathname === "/processes" || pathname.startsWith("/process/"))}
          >
            <NavIcon name="processes" />
            Active Processes
          </Link>
        </nav>

        <div className="shrink-0 border-t border-surface-100 p-4">
          <div className="rounded-xl border border-surface-200 bg-surface-50/80 p-3">
            <div className="flex items-center gap-3">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700"
                aria-hidden
              >
                {initialsFromEmail(me?.email)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-surface-900">
                  {me?.email?.split("@")[0]?.replace(/\./g, " ") ?? "Signed in"}
                </p>
                <p className="truncate text-xs text-surface-500">
                  {me?.email ?? "—"}
                </p>
              </div>
            </div>
            <p className="mt-2 text-[11px] leading-snug text-surface-400">
              Switch user to see different perspectives.
            </p>
            <div className="mt-2">
              <SignOutLink className="text-xs font-medium text-primary-600 hover:text-primary-700" />
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-surface-50">
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
