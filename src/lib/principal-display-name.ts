import type { AuthPrincipal } from "@/services/auth";

/** Human-readable label from JWT-backed principal (access token claims). */
export function principalDisplayName(principal: AuthPrincipal | null): string | undefined {
  if (!principal) return undefined;
  const name = principal.name?.trim();
  if (name) return name;
  const email = principal.email?.trim();
  if (email) return email;
  return undefined;
}
