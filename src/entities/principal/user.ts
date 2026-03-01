import type { PrincipalBase } from "./principal-base";

export type User = PrincipalBase & {
  type: "user";
};
