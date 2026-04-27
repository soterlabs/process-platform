import type { JWTPayload } from "jose";
import type { Process } from "@/entities/process";

export const AuthenticationServiceSymbol = Symbol.for("AuthenticationService");
export const AuthorizationServiceSymbol = Symbol.for("AuthorizationService");

/** Verified session identity; `permissions` are Auth0 RBAC permission strings from the access token. */
export type AuthPrincipal = {
  userId: string;
  permissions: string[];
  email?: string;
};

export interface IAuthenticationService {
  /** Cryptographically verify the Bearer session token and return the principal. */
  verifySessionToken(token: string): Promise<AuthPrincipal | null>;
  /**
   * Map a decoded JWT payload to principal (e.g. after decodeJwt in API handlers).
   * Must match the same rules as verifySessionToken for that provider.
   */
  principalFromJwtPayload(payload: JWTPayload): AuthPrincipal | null;
  /** OAuth2 authorization-code callback: exchange code, return token + redirect path. */
  completeOAuthLogin(params: {
    code: string;
    state: string;
    redirectUri: string;
  }): Promise<{ token: string; returnUrl: string }>;
  /**
   * Start OAuth login: return URL to redirect the browser to the IdP.
   * `connection` (e.g. Auth0 social connection name `google-oauth2`) skips the hosted login chooser and sends users straight to that IdP.
   */
  buildOAuthLoginUrl(
    returnUrl: string,
    options?: { connection?: string }
  ): Promise<string>;
}

export interface IAuthorizationService {
  userHasPermission(permissions: string[], permission: string): boolean;
  canUserActOnStep(
    userPermissions: string[],
    /** Template field: permission strings required to act on this step (empty = any authenticated user). */
    requiredPermissions: string[] | undefined
  ): boolean;
  checkStepAuth(
    processId: string,
    stepId: string,
    userId: string | null,
    permissions: string[],
    options?: {
      intent?: "update" | "complete";
      /** Merged into the step’s context when evaluating `completeExpression` on complete. */
      mergeStepContextPayload?: Record<string, unknown>;
    }
  ): Promise<{ authorized: boolean; status?: number; body?: unknown }>;
  canUserActOnCurrentStep(
    process: Process,
    userId: string | null,
    permissions: string[]
  ): boolean;
  /** Whether the user may call complete on the current input step (edit + optional `completeExpression`). */
  canCompleteCurrentStep(
    process: Process,
    userId: string | null,
    permissions: string[]
  ): boolean;
}
