/**
 * Auth: authentication (sign-in, tokens) and authorization (roles, step access).
 * All consumers import the interfaces and service instances from here.
 */
import type { IAuthenticationService, IAuthorizationService } from "./interface";
import { authenticationService } from "./authentication";
import { authorizationService } from "./authorization";

export type { IAuthenticationService, IAuthorizationService };
export { AuthenticationServiceSymbol, AuthorizationServiceSymbol } from "./interface";

export { authenticationService, authorizationService };
