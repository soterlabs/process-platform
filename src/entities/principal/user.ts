import type { PrincipalBase } from "./principal-base";

export type User = PrincipalBase & {
  type: "user";
  /** User email address (e.g. from Google OAuth or set manually). */
  email?: string;
  /** EVM address for wallet sign-in. Optional if user signs in with Google. */
  evmWalletAddress?: string;
  /** Google OAuth sub (subject) for Google SSO. */
  googleId?: string;
};
