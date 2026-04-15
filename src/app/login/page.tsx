"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const SIGNIN_BUTTON_HEIGHT_PX = 40;
const SIGNIN_BUTTON_RADIUS_PX = 4;

/** Auth0 social connection name for Google (Dashboard → Authentication → Social). */
const GOOGLE_CONNECTION = "google-oauth2";
/**
 * Auth0 database connection for username/password (Dashboard → Authentication → Database).
 * Override via NEXT_PUBLIC_AUTH0_DATABASE_CONNECTION if your tenant uses a different name.
 */
const DATABASE_CONNECTION =
  process.env.NEXT_PUBLIC_AUTH0_DATABASE_CONNECTION?.trim() ||
  "Username-Password-Authentication";

function LoginForm() {
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") ?? "/";
  const errorParam = searchParams.get("error");
  const returnEnc = encodeURIComponent(returnUrl);
  const passwordHref = `/api/auth/login?returnUrl=${returnEnc}&connection=${encodeURIComponent(DATABASE_CONNECTION)}`;
  const googleHref = `/api/auth/login?returnUrl=${returnEnc}&connection=${encodeURIComponent(GOOGLE_CONNECTION)}`;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center bg-surface-50 px-6">
      <h1 className="text-2xl font-semibold text-surface-900">
        Sign in to processOS
      </h1>
      <p className="mt-2 text-center text-surface-500">
        Sign in with Google or email and password
      </p>
      <div className="mt-8 flex w-full max-w-[280px] flex-col items-stretch gap-3">
        <a
          href={googleHref}
          className="flex w-full items-center justify-center gap-3 border border-surface-300 bg-white px-6 text-center text-surface-900 shadow-sm transition hover:border-surface-400 hover:bg-surface-50"
          style={{
            height: SIGNIN_BUTTON_HEIGHT_PX,
            borderRadius: SIGNIN_BUTTON_RADIUS_PX,
          }}
        >
          Continue with Google
        </a>
        <a
          href={passwordHref}
          className="flex w-full items-center justify-center gap-3 border border-surface-200 bg-surface-100 px-6 text-center text-sm text-surface-700 transition hover:bg-surface-200"
          style={{
            minHeight: SIGNIN_BUTTON_HEIGHT_PX,
            borderRadius: SIGNIN_BUTTON_RADIUS_PX,
          }}
        >
          Other sign-in options
        </a>
      </div>
      {errorParam && (
        <p className="mt-4 max-w-sm text-center text-sm text-red-600" role="alert">
          {errorParam}
        </p>
      )}
      <Link
        href="/"
        className="mt-8 text-sm text-surface-500 hover:text-surface-700"
      >
        ← Back to home
      </Link>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center bg-surface-50 px-6">
          <p className="text-surface-500">Loading…</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
