import type { PrincipalBase } from "./principal-base";

export type Group = PrincipalBase & {
  type: "group";
  roles: string[];
};
