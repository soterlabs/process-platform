"use client";

import { useCallback, useEffect, useState } from "react";
import { decodeTokenPayload, getToken } from "./auth-client";

export type Me = { userId: string; roles: string[] };

function meFromToken(): Me | null {
  const token = getToken();
  if (!token) return null;
  return decodeTokenPayload(token);
}

export function useMe(): {
  me: Me | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    setError(null);
    setMe(meFromToken());
    setLoading(false);
  }, []);

  useEffect(() => {
    setMe(meFromToken());
    setLoading(false);
  }, []);

  return { me, loading, error, refetch };
}
