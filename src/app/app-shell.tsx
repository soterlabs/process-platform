"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMe } from "@/hooks/use-me";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { SignOutLink } from "./sign-out-link";

const PUBLIC_PATHS = ["/login"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { me } = useMe();
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (isPublic) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b border-stone-700/80 bg-stone-900/95 px-4 backdrop-blur sm:px-6">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold text-stone-100 transition hover:text-white"
          >
            <span className="text-lg tracking-tight">Process Platform</span>
          </Link>
          {pathname !== "/" && (
            <nav className="hidden items-center gap-1 sm:flex">
              <Link
                href="/"
                className="rounded-md px-3 py-2 text-sm text-stone-400 transition hover:bg-stone-800 hover:text-stone-200"
              >
                Home
              </Link>
              {hasPermission(me?.permissions, PERMISSIONS.TEMPLATES_READ) && (
                <Link
                  href="/templates"
                  className="rounded-md px-3 py-2 text-sm text-stone-400 transition hover:bg-stone-800 hover:text-stone-200"
                >
                  Templates
                </Link>
              )}
            </nav>
          )}
        </div>
        <div className="flex items-center gap-2">
          <SignOutLink className="rounded-md px-3 py-2 text-sm text-stone-400 transition hover:bg-stone-800 hover:text-stone-200" />
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
