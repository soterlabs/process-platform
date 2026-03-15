import type { Process } from "@/entities/process";

export const AuthenticationServiceSymbol = Symbol.for("AuthenticationService");
export const AuthorizationServiceSymbol = Symbol.for("AuthorizationService");

export interface IAuthenticationService {
  createChallenge(walletAddress: string): Promise<{ message: string }>;
  verifyAndIssueToken(
    walletAddress: string,
    message: string,
    signature: string
  ): Promise<{ token: string; userId: string }>;
  verifyGoogleIdTokenAndIssueToken(idToken: string): Promise<{ token: string; userId: string }>;
  verifyToken(token: string): Promise<{ userId: string; roles: string[] } | null>;
}

export interface IAuthorizationService {
  getUserRoles(userId: string): Promise<string[]>;
  userHasRole(userId: string, role: string): Promise<boolean>;
  canUserActOnStep(
    userId: string,
    allowedRoles: string[] | undefined
  ): Promise<boolean>;
  checkStepAuth(
    processId: string,
    stepId: string,
    userId: string | null
  ): Promise<{ authorized: boolean; status?: number; body?: unknown }>;
  canUserActOnCurrentStep(process: Process, userId: string | null): Promise<boolean>;
}
