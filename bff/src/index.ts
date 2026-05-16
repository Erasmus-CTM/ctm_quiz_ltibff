import "dotenv/config";
import { Provider as Lti } from "ltijs";
import express from "express";
import { submitRoute } from "./routes/submit";

Lti.setup(
  process.env.LTI_KEY ?? "CHANGE_ME_IN_PRODUCTION",
  { url: process.env.MONGODB_URI ?? `mongodb://localhost:27017/lti` },
  {
    appRoute: "/",
    loginRoute: "/lti/login",
    sessionTimeoutRoute: "/lti/session-timeout",
    invalidTokenRoute: "/lti/invalid-token",
    keysetRoute: "/lti/jwks",
    // Allow the quiz frontend origin
    cors: true,
    // Cookie options — set secure:true behind HTTPS in prod
    cookies: { secure: process.env.NODE_ENV === "production", sameSite: "None" },
    devMode: process.env.NODE_ENV !== "production",
  }
);

// Register Canvas as a platform 
Lti.onConnect(async (token, _req, res) => {
  // token contains the validated LTI claims
  console.log("LTI CONNECTION", token)

  // Redirect the browser into the quiz app
  const quizBase = process.env.QUIZ_BASE_URL ?? "http://localhost:5173";
  const contextId = token.platformContext?.context?.id ?? "";
  const resourceId = token.platformContext?.resource?.id ?? "";
  return res.redirect(`${quizBase}/?context=${contextId}&resource=${resourceId}`);
});

Lti.app.use(express.json());

Lti.app.use("/api", submitRoute());

// Health — no auth required
Lti.app.get("/health", (_req, res) => res.json({ ok: true }));

const PORT = Number(process.env.PORT ?? 3000);
Lti.app.use(express.urlencoded({ extended: true }));
(Lti as any).onInvalidToken((req: any, res: any, next: any) => {
  console.log("INVALID TOKEN");
  console.log(req);

  res.status(401).json(req);
});
async function main() {

  Lti.app.use((req, _res, next) => {
    console.log("====== REQUEST ======");
    console.log(req.method, req.url);
    console.log(req.headers);
    console.log("BODY:", req.body);
    next();
  });
  console.log("Deploy Lti...")
  await Lti.deploy({ port: PORT });

  console.log("Lti: registering canvas platform...")
  // Register the mock (or real) Canvas platform
  const platform: any = await Lti.registerPlatform({
    // url: MUST MATCH jwt iss field
    url: process.env.CANVAS_BASE_URL ?? "http://localhost:3001",
    name: process.env.CANVAS_PLATFORM_NAME ?? "Mock Canvas",
    // url: MUST MATCH jwt aud field
    clientId: process.env.CANVAS_CLIENT_ID ?? "mock-client-id-12345",
    authenticationEndpoint:
      process.env.CANVAS_AUTH_ENDPOINT ?? "http://localhost:3001/lti/authorize",
    accesstokenEndpoint:
      process.env.CANVAS_TOKEN_ENDPOINT ?? "http://localhost:3001/lti/token",
    authConfig: {
      method: "JWK_SET",
      key: process.env.CANVAS_JWKS_URL ?? "http://localhost:3001/lti/jwks",
    },
  });

  const platforms = await (Lti as any).getAllPlatforms()
  console.log(platforms)


  console.log(`BFF running on http://localhost:${PORT}`);
}

main().catch((err) => {
  console.error("Startup failed:", err);
  process.exit(1);
});