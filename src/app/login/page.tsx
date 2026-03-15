"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { setToken } from "@/lib/auth-client";

const NEXT_PUBLIC_GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

/** Match Google’s default “large” button so both sign-in buttons align. */
const SIGNIN_BUTTON_HEIGHT_PX = 40;
const SIGNIN_BUTTON_RADIUS_PX = 4;

declare global {
  interface Window {
    ethereum?: {
      request: (args: {
        method: string;
        params?: unknown[];
      }) => Promise<unknown>;
    };
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: string;
              size?: string;
              type?: string;
              text?: string;
              width?: number;
              height?: number;
            }
          ) => void;
        };
      };
    };
  }
}

function toHex(message: string): string {
  const bytes = new TextEncoder().encode(message);
  return (
    "0x" +
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") ?? "/";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const routerRef = useRef(router);
  const returnUrlRef = useRef(returnUrl);
  routerRef.current = router;
  returnUrlRef.current = returnUrl;

  const handleGoogleCredential = useCallback(async (credential: string) => {
    setError(null);
    setGoogleLoading(true);
    try {
      const res = await fetch("/api/auth/verify-google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: credential }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Google sign-in failed");
        return;
      }
      setToken(data.token);
      routerRef.current.replace(returnUrlRef.current);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Google sign-in failed");
    } finally {
      setGoogleLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!NEXT_PUBLIC_GOOGLE_CLIENT_ID || !googleButtonRef.current) return;
    const init = () => {
      if (!window.google?.accounts?.id || !googleButtonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        callback: (res) => void handleGoogleCredential(res.credential),
      });
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "filled_black",
        size: "large",
        type: "standard",
        text: "continue_with",
        width: 280,
        height: SIGNIN_BUTTON_HEIGHT_PX,
      });
    };
    if (window.google?.accounts?.id) {
      init();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = init;
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [handleGoogleCredential]);

  const handleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const ethereum = window.ethereum;
      if (!ethereum) {
        setError("MetaMask (or another EVM wallet) is required. Please install it and try again.");
        return;
      }
      const accounts = (await ethereum.request({
        method: "eth_requestAccounts",
        params: [],
      })) as string[];
      const address = accounts[0];
      if (!address) {
        setError("No wallet account selected.");
        return;
      }

      const challengeRes = await fetch("/api/auth/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address }),
      });
      const challengeData = await challengeRes.json();
      if (!challengeRes.ok) {
        setError(challengeData.error ?? "Failed to get challenge");
        return;
      }
      const message = challengeData.message as string;

      const hexMessage = toHex(message);
      const signature = (await ethereum.request({
        method: "personal_sign",
        params: [hexMessage, address],
      })) as string;

      const verifyRes = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          message,
          signature: signature.startsWith("0x") ? signature : `0x${signature}`,
        }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        setError(verifyData.error ?? "Verification failed");
        return;
      }
      setToken(verifyData.token);
      router.replace(returnUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6">
      <h1 className="text-2xl font-semibold text-stone-100">
        Sign in to Process Platform
      </h1>
      <p className="mt-2 text-center text-stone-400">
        Sign in with your EVM wallet or Google
      </p>
      <div className="mt-8 flex w-full max-w-[280px] flex-col items-stretch gap-3">
        <div className="flex w-full flex-col items-stretch gap-2">
          {NEXT_PUBLIC_GOOGLE_CLIENT_ID ? (
            <div
              ref={googleButtonRef}
              aria-busy={googleLoading}
              aria-label="Sign in with Google"
            />
          ) : (
            <button
              type="button"
              disabled
              className="flex w-full items-center justify-center gap-3 border border-stone-600 bg-stone-700/80 px-6 text-stone-300"
              style={{
                height: SIGNIN_BUTTON_HEIGHT_PX,
                borderRadius: SIGNIN_BUTTON_RADIUS_PX,
              }}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign in with Google
            </button>
          )}
          {!NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
            <p className="text-center text-xs text-stone-500">
              Set NEXT_PUBLIC_GOOGLE_CLIENT_ID to enable
            </p>
          )}
        </div>
        <div className="flex w-full items-center gap-3">
          <span className="h-px flex-1 bg-stone-600" aria-hidden />
          <span className="text-xs text-stone-500">or</span>
          <span className="h-px flex-1 bg-stone-600" aria-hidden />
        </div>
        <button
          type="button"
          onClick={handleSignIn}
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 border border-stone-600 bg-stone-700/80 px-6 text-stone-100 transition hover:bg-stone-600/80 disabled:opacity-50"
          style={{
            height: SIGNIN_BUTTON_HEIGHT_PX,
            borderRadius: SIGNIN_BUTTON_RADIUS_PX,
          }}
        >
          {loading ? (
            <span
              className="h-5 w-5 animate-spin rounded-full border-2 border-stone-400 border-t-transparent"
              aria-hidden
            />
          ) : (
            <span className="text-xl" aria-hidden>
              🦊
            </span>
          )}
          {loading ? "Signing in…" : "Sign in with MetaMask"}
        </button>
      </div>
      {error && (
        <p className="mt-4 max-w-sm text-center text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
      <Link
        href="/"
        className="mt-8 text-sm text-stone-500 hover:text-stone-400"
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
        <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6">
          <p className="text-stone-400">Loading…</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
