import { Provider as lti } from "ltijs";
import express from "express";
import { submitRoute } from "./routes/submit";
import path from "path";
import { readFileSync } from "fs";

/**
 * Handle all setup for the Lti app.
 * @returns LtiProvider
 */
export async function createLtiApp() {
  console.log("Creating LTI app");
  const bffUrl = process.env.BFF_BASE_URL;
  console.assert(bffUrl)

  lti.setup(
    process.env.LTI_KEY ?? "DUMMY_KEY",
    {
      url: process.env.MONGODB_URI ?? "mongodb://localhost:27017/lti",
    },
    {
      appRoute: "/lti",
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
      // dynReg: {
      //   url: bffUrl,
      //   name: "CTM Quiz BFF",
      //   description: "Testing if this works",
      //   autoActivate: true,
      // }
    },
  );

  // --- body parsers first ---
  lti.app.use(express.urlencoded({ extended: true }));
  lti.app.use(express.json());

  // logging
  lti.app.use((req, _res, next) => {
    // only log "interesting" requests.
    if (req.url != "/favicon.ico") {
      console.log("====== REQUEST ======");
      console.log(req.method, req.url);
      console.log(req.headers);
      console.log("BODY:", req.body);
    }
    next();
  });
  // routes
  lti.app.use("/lti/api", submitRoute());

  lti.app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });


  lti.app.get("/lti/launch", (_req, res) => {
    // This is called when adding the tool to an assignment
    // GET /lti/launch?placement=assignment_selection&...
    // We need to return some teacher-ui
    const ltik = res.locals.ltik;
    const placement = _req.query.placement ?? "";

    // e.g. placement === "course_navigation" vs "assignment" etc.
    console.log("Launch placement:", placement);

    if (placement == "assignment_selection") {
      // Show teacher UI

      return res.send(`
      <html><body>
        <h2>Select a quiz to add</h2>
        <form method="POST" action="/lti/deep-link-confirm?ltik=${ltik}">
          <label>
            Quiz ID:
            <input name="quizId" value="quiz-001" required />
          </label>
          <label>
            Title:
            <input name="title" value="My Quiz" required />
          </label>
          <button type="submit">Add to assignment</button>
        </form>
      </body></html>
    `);
    }
    // else show student UI (dummy)
    // res.send(`
    //   <h2>The quiz!</h2>
    //   <form method="POST" action="/lti/api/submit-dummy?ltik=${ltik}">
    //   <p>What is 1+1?</p>
    //   <input name="correct" type="number"/>
    //   /<input name="total" type="number"/>
    //   <button>submit</button>
    //   </form>
    //   `);
    // else show student UI (quarto quiz)

    const QUIZ_HTML = path.resolve(process.env.QUIZ_HTML_PATH ?? "./quiz.html");

    let html = readFileSync(QUIZ_HTML, "utf-8");
    // prepare where to send results
    const submitUrl = `/lti/api/submit?ltik=${ltik}`
    html = html.replace("__LTI_PLACEHOLDER__", submitUrl);

    return res.send(html);

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


    const placement = _req.query.placement as string ?? "";

    const contextId = token.platformContext?.context?.id ?? "";
    const resourceId = token.platformContext?.resource?.id ?? "";

    // e.g. placement === "course_navigation" vs "assignment" etc.
    console.log("Launch placement:", placement);
    console.log("Message type:", (token as any).messageType);
    return res.redirect(
      `/lti/launch/?context=${contextId}&resource=${resourceId}`,
    );
    // return res.redirect(
    //   `${quizBase}/?context=${contextId}&resource=${resourceId}`,
    // );
  });

  // This route is hit by the teacher's form submission.
  lti.app.post("/lti/deep-link-confirm", async (req: any, res: any) => {
    const { quizId, title } = req.body;
    const domain = process.env.BFF_BASE_URL ?? "http://localhost:3000";

    const items = [
      {
        type: "ltiResourceLink",
        title: title ?? "Quiz",
        url: `${domain}/lti/launch`,           // ltijs main route — triggers onConnect
        custom: { quizId },             // passed back to you at launch time
      },
    ];

    // res.locals.token is populated by ltijs because ltik was in the query
    const form = await (lti as any).DeepLinking.createDeepLinkingForm(
      res.locals.token,
      items,
      { message: "Quiz added successfully" },
    );

    // This is an auto-submitting form that POSTs the JWT back to Canvas
    return res.send(form);
  });


  (lti as any).onDeepLinking(async (token: any, req: any, res: any) => {
    console.log('Deep linking launch success')
    console.log(token)
    const ltik = res.locals.ltik;
    const quizBase = process.env.QUIZ_BASE_URL ?? "http://localhost:5173";

    // return res.redirect(`${quizBase}/deep-link?ltik=${ltik}`);
    return res.send('Deep linking selection UI here, or reidrect to quiz?')
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
  (lti as any).onUnregisteredPlatform((req: Request, res: any) => {
    console.log("Unregistered platform  @" + req.url);
    const b = req.body;
    // add more info
    // e.method = req.method;
    console.log(b);
    return res.status(400).send({ "body": b });
  });

  return lti;
}
