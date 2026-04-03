"use client";

import { useCallback, useEffect, useState } from "react";
import { authFetch, getToken } from "@/lib/auth-client";

export type Me = { userId: string; permissions: string[]; email?: string };

export function useMe(): {
  me: Me | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setError(null);
    if (!getToken()) {
      setMe(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await authFetch("/api/me");
      if (!res.ok) {
        setMe(null);
        return;
      }
      const data = (await res.json()) as Me;
      setMe(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown");
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { me, loading, error, refetch };
}
