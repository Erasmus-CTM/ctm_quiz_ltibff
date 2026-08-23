import { Provider as lti } from "ltijs";
import express from "express";
import { submitRoute } from "./routes/submit";
import path from "path";
import { existsSync, readFileSync } from "fs";
import { injectDisclaimer, injectLtikSubmitUrl } from "./content_inject";
import multer from "multer";
import fs from "fs";


// Make sure the directory exists once at startup
const quizzesDir = path.resolve(process.cwd(), "quizzes");
fs.mkdirSync(quizzesDir, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(), // keep file in memory, then we write it ourselves
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB, adjust as needed
  },
  fileFilter: (_req, file, cb) => {
    // Prefer checking both mimetype and extension
    const okMime = file.mimetype === "text/html";
    const okExt = file.originalname.toLowerCase().endsWith(".html");

    if (okMime || okExt) {
      cb(null, true);
    } else {
      cb(new Error("Only HTML files are allowed"));
    }
  },
});

function sanitizeQuizId(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const quizId = value.trim();

  // Keep it simple and safe: letters, digits, underscore, dash only
  if (!/^[A-Za-z0-9_-]+$/.test(quizId)) return null;

  return quizId;
}

/**
 * Handle all setup for the Lti app.
 * @returns LtiProvider
 */
export async function createLtiApp() {
  console.log("Creating LTI app");
  const bffUrl = process.env.BFF_BASE_URL;
  console.assert(bffUrl, "needs env.BFF_BASE_URL")

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
      // dynamic registration is probably (?) supported by Canvas. Maybe it's better in the long run.
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
      // console.log("token:", _res.locals.token);
    }
    next();
  });
  // routes
  lti.app.use("/lti/api", submitRoute());

  lti.app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });


  lti.app.get("/lti/launch", (req, res) => {
    // This is called when adding the tool to an assignment
    // GET /lti/launch?placement=assignment_selection&...
    // We need to return some teacher-ui
    const ltik = res.locals.ltik;
    const placement = req.query.placement ?? "";

    // e.g. placement === "course_navigation" vs "assignment" etc.
    console.log("Launch placement:", placement);
    if (placement == "assignment_selection") {
      // Show teacher UI
      let html = readFileSync("./pages/teacher_setup.html", "utf-8");
      html = html.replace("__LTI_PLACEHOLDER__", ltik)

      // which quizzes exist?
      const exist = fs.readdirSync(quizzesDir)
      html = html.replace("__QUIZZES_PLACEHOLDER__", exist.length ? exist.map((s) => s.replace(/\.html/, "")).join("\n") : "Nothing")
      return res.send(injectDisclaimer(html));
    }

    // else show student UI (quarto quiz)
    // which quiz is requested?
    const qIdRaw = res.locals.token.platformContext.custom.quizId;
    if (!qIdRaw) {
      return res.status(400).json({ error: "Invalid or missing quizId" });
    }

    const quizId = sanitizeQuizId(qIdRaw);
    const filepath = path.join(quizzesDir, `${quizId}.html`);

    let html = readFileSync(path.resolve(filepath), "utf-8");
    // prepare where to send results
    html = injectLtikSubmitUrl(html, ltik)
    html = injectDisclaimer(html)
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
  });

  // This route is hit by the teacher's form submission.
  lti.app.post(
    "/lti/deep-link-confirm",
    upload.single("quizFile"), // form field name must be
    async (req: any, res: any) => {
      let msg = "unknown error";
      try {
        const quizId = sanitizeQuizId(req.body?.quizId);

        if (!quizId) {
          return res.status(400).json({ error: "Invalid or missing quizId" });
        }

        if (!req.file) {
          return res.status(400).json({ error: "No HTML file uploaded" });
        }

        const filepath = path.join(quizzesDir, `${quizId}.html`);

        if (existsSync(filepath)) {
          console.log("Reusing existing quiz:", quizId);
          msg = "Reusing existing quiz";
        } else {
          if (!req.file) {
            return res.status(400).json({
              error: `Quiz '${quizId}' does not exist and no file was uploaded`,
            });
          }

          await fs.promises.writeFile(filepath, req.file.buffer, {
            flag: "wx",
          });

          console.log("File saved successfully:", quizId);
          msg = "Quiz uploaded successfully";
        }

        // === LTI stuff ===

        const domain = process.env.BFF_BASE_URL ?? "http://localhost:3000";

        const items = [
          {
            type: "ltiResourceLink",
            title: quizId,
            url: `${domain}/lti/launch`,
            custom: { quizId },
          },
        ];

        // res.locals.token is populated by ltijs because ltik was in the query
        const form = await (lti as any).DeepLinking.createDeepLinkingForm(
          res.locals.token,
          items,
          { message: msg },
        );

        // This is an auto-submitting form that POSTs the JWT back to Canvas
        return res.send(form);
      } catch (err) {
        console.error("Upload failed:", err);
        return res.status(500).json({ error: "Upload failed" });
      }
    }
  );

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
