// Type declarations for ltijs (no official @types package available)
// Covers the subset of the API used by this BFF — extend as needed.

declare module "ltijs" {
  import { RequestHandler, Express } from "express";

  export interface PlatformConfig {
    url: string;
    name: string;
    clientId: string;
    authenticationEndpoint: string;
    accesstokenEndpoint: string;
    authConfig:
      | { method: "JWK_SET"; key: string }
      | { method: "JWK_KEY"; key: string }
      | { method: "RSA_KEY"; key: string };
  }

  export interface LtiSetupOptions {
    appRoute?: string;
    loginRoute?: string;
    sessionTimeoutRoute?: string;
    invalidTokenRoute?: string;
    keysetRoute?: string;
    cors?: boolean;
    cookies?: {
      secure?: boolean;
      sameSite?: "None" | "Lax" | "Strict";
    };
    devMode?: bool;
  }

  export interface ResourceLink {
    id?: string;
    title?: string;
  }

  export interface LtiContext {
    id?: string;
    label?: string;
    title?: string;
  }

  export interface PlatformContext {
    context?: LtiContext;
    resource?: ResourceLink;
    /** AGS endpoint claim */
    endpoint?: {
      lineitem?: string;
      lineitems?: string;
      scope?: string[];
    };
  }

  export interface IdToken {
    /** Canvas user ID (sub claim) */
    user: string;
    platformContext: PlatformContext;
    /** Raw LTI claims */
    claims?: Record<string, unknown>;
  }

  export interface ScorePayload {
    userId: string;
    scoreGiven: number;
    scoreMaximum: number;
    activityProgress: string;
    gradingProgress: string;
    timestamp: string;
  }

  export interface Grade {
    scoreGrades(token: IdToken, score: ScorePayload): Promise<unknown>;
  }

  export interface DeployOptions {
    port?: number;
    silent?: boolean;
  }

  interface LtiProvider {
    /** Express app — attach extra routes here */
    app: Express;

    /** Middleware that rejects requests without a valid ltijs session */
    protect(): RequestHandler;

    setup(key: string, db: { url: string }, options?: any): void;

    deploy(options?: DeployOptions): Promise<void>;

    registerPlatform(config: PlatformConfig): Promise<unknown>;

    /** Register a callback fired after a successful LTI launch */
    onConnect(
      callback: (
        token: IdToken,
        req: import("express").Request,
        res: import("express").Response,
      ) => void | Promise<void>,
    ): void;

    Grade: Grade;
  }

  const Lti: LtiProvider;
  export default Lti;
  export const Provider: LtiProvider;
}
