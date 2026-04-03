/**
 * Auth: authentication (sign-in, tokens) and authorization (permissions, step access).
 * All consumers import the interfaces and service instances from here.
 */
import { authenticationService } from "./authentication";
import { authorizationService } from "./authorization";

export type {
  AuthPrincipal,
  IAuthenticationService,
  IAuthorizationService,
} from "./interface";
export { AuthenticationServiceSymbol, AuthorizationServiceSymbol } from "./interface";

export { authenticationService, authorizationService };
