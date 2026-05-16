import express from "express";
import coursesRouter from "./routes/courses";
import usersRouter from "./routes/users";
import ltiRouter from "./routes/lti";



const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log every request so you can see what the BFF is actually sending
app.use((req, _res, next) => {
    console.log(`[mock-canvas] ${req.method} ${req.path}`, req.body ?? "");
    next();
});

app.use("/api/v1/courses", coursesRouter);
app.use("/api/v1/users", usersRouter);

// LTI endpoints (OIDC login + launch)
app.use("/lti", ltiRouter);

app.get("/", (_req, res) => res.json({ status: "MOCK CANVAS IS HERE" }));
app.get("/health", (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => console.log(`mock-canvas running on http://localhost:${PORT}`));