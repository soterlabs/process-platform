"use client";

import Link from "next/link";
import { removeToken } from "@/lib/auth-client";

export function SignOutLink() {
  return (
    <Link
      href="/login"
      onClick={() => removeToken()}
      className="text-sm text-stone-500 hover:text-stone-400"
    >
      Sign out
    </Link>
  );
}
