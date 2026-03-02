"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { isAuthenticated } from "@/lib/auth-client";

const PUBLIC_PATHS = ["/login"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
    if (isPublic) return;
    if (!isAuthenticated()) {
      const returnUrl = encodeURIComponent(
        pathname + (typeof window !== "undefined" ? window.location.search : "")
      );
      window.location.href = `/login?returnUrl=${returnUrl}`;
    }
  }, [pathname]);

  return <>{children}</>;
}
