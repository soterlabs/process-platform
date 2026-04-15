"use client";

import Link from "next/link";
import { removeToken } from "@/lib/auth-client";

type SignOutLinkProps = {
  className?: string;
};

export function SignOutLink({ className }: SignOutLinkProps) {
  return (
    <Link
      href="/login"
      onClick={() => removeToken()}
      className={className ?? "text-sm text-surface-500 hover:text-surface-700"}
    >
      Sign out
    </Link>
  );
}
