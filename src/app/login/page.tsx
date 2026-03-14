"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Link from "next/link";
import { setToken } from "@/lib/auth-client";

declare global {
  interface Window {
    ethereum?: {
      request: (args: {
        method: string;
        params?: unknown[];
      }) => Promise<unknown>;
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
        Connect your EVM wallet to continue. You must be registered (your wallet
        address linked to a user) to sign in.
      </p>
      <button
        type="button"
        onClick={handleSignIn}
        disabled={loading}
        className="mt-8 flex items-center gap-3 rounded-xl border border-stone-600 bg-amber-600/20 px-6 py-3 text-stone-100 transition hover:border-amber-500/50 hover:bg-amber-600/30 disabled:opacity-50"
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
