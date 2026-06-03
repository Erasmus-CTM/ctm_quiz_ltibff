import { Provider as lti } from "ltijs";
import express from "express";
import { submitRoute } from "./routes/submit";

/**
 * Handle all setup for the Lti app.
 * @returns LtiProvider
 */
export async function createLtiApp() {
  console.log("Creating LTI app");

  lti.setup(
    process.env.LTI_KEY ?? "DUMMY_KEY",
    {
      url: process.env.MONGODB_URI ?? "mongodb://localhost:27017/lti",
    },
    {
      appRoute: "/lti", // not root, so we are allowed to have routes without lti-auth! 
      loginRoute: "/lti/login",
      sessionTimeoutRoute: "/lti/session-timeout",
      invalidTokenRoute: "/lti/invalid-token",
      keysetRoute: "/.well-known/jwks.json",
      cors: true,
      cookies: {
        secure: process.env.NODE_ENV === "production",
        sameSite: "None",
      },
      devMode: process.env.NODE_ENV !== "production",
    },
  );

  // --- body parsers first ---
  lti.app.use(express.urlencoded({ extended: true }));
  lti.app.use(express.json());

  // logging
  lti.app.use((req, _res, next) => {
    console.log("====== REQUEST ======");
    console.log(req.method, req.url);
    console.log(req.headers);
    console.log("BODY:", req.body);
    next();
  });
  // routes
  lti.app.use("/api", submitRoute());

  lti.app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });
  lti.app.get("/debug", (req, res) => {
    console.log("cookies", req.headers.cookie);
    console.log("query", req.query);
    console.log("auth", req.headers.authorization);
    res.send("ok");
  });
  // Health should be accesible without auth
  (lti as any).whitelist({ route: '/health', method: 'get' }, { route: '/health', method: 'head' },);
  (lti as any).whitelist({ route: '/debug', method: 'get' });
  (lti as any).whitelist({ route: '/favicon.ico', method: 'get' });

  // handlers
  lti.onConnect(async (token, _req, res) => {
    console.log("LTI CONNECTION", token);
    console.log("LTIK:", res.locals.ltik);
    console.log("locals:", Object.keys(res.locals));

    const quizBase = process.env.QUIZ_BASE_URL ?? "http://localhost:5173";

    const contextId = token.platformContext?.context?.id ?? "";
    const resourceId = token.platformContext?.resource?.id ?? "";

    return res.redirect(
      `${quizBase}/?context=${contextId}&resource=${resourceId}`,
    );
  });

  // print informative errors.
  (lti as any).onInvalidToken((req: Request, res: any, next: any) => {
    console.log("INVALID TOKEN  @" + req.url);
    const e = res.locals.err;
    // add more info
    e.method = req.method;
    console.log(e);
    return res.status(401).send(e);
  });

  return lti;
}
