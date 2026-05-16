"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const ltijs_1 = __importDefault(require("ltijs"));
const express_1 = __importDefault(require("express"));
const submit_1 = require("./routes/submit");
const db = process.env.DB_PATH ?? "./ltijs.db"; // ltijs uses a local mongodb-style db
ltijs_1.default.setup(process.env.LTI_KEY ?? "CHANGE_ME_IN_PRODUCTION", { url: process.env.MONGODB_URI ?? `mongodb://localhost:27017/lti` }, {
    appRoute: "/",
    loginRoute: "/lti/login",
    sessionTimeoutRoute: "/lti/session-timeout",
    invalidTokenRoute: "/lti/invalid-token",
    keysetRoute: "/lti/jwks",
    // Allow the quiz frontend origin
    cors: true,
    // Cookie options — set secure:true behind HTTPS in prod
    cookies: { secure: process.env.NODE_ENV === "production", sameSite: "None" },
});
// ── Register Canvas as a platform ──────────────────────────────────────────
ltijs_1.default.onConnect(async (token, _req, res) => {
    // token contains the validated LTI claims
    // Redirect the browser into the quiz app
    const quizBase = process.env.QUIZ_BASE_URL ?? "http://localhost:5173";
    const contextId = token.platformContext?.context?.id ?? "";
    const resourceId = token.platformContext?.resource?.id ?? "";
    return res.redirect(`${quizBase}/?context=${contextId}&resource=${resourceId}`);
});
ltijs_1.default.app.use(express_1.default.json());
ltijs_1.default.app.use("/api", (0, submit_1.submitRoute)());
// Health — no auth required
ltijs_1.default.app.get("/health", (_req, res) => res.json({ ok: true }));
const PORT = Number(process.env.PORT ?? 3000);
async function main() {
    await ltijs_1.default.deploy({ port: PORT });
    // Register the mock (or real) Canvas platform
    await ltijs_1.default.registerPlatform({
        url: process.env.CANVAS_BASE_URL ?? "http://localhost:3001",
        name: process.env.CANVAS_PLATFORM_NAME ?? "Mock Canvas",
        clientId: process.env.CANVAS_CLIENT_ID ?? "mock-client-id-12345",
        authenticationEndpoint: process.env.CANVAS_AUTH_ENDPOINT ?? "http://localhost:3001/lti/authorize",
        accesstokenEndpoint: process.env.CANVAS_TOKEN_ENDPOINT ?? "http://localhost:3001/lti/token",
        authConfig: {
            method: "JWK_SET",
            key: process.env.CANVAS_JWKS_URL ?? "http://localhost:3001/lti/jwks",
        },
    });
    console.log(`BFF running on http://localhost:${PORT}`);
}
main().catch((err) => {
    console.error("Startup failed:", err);
    process.exit(1);
});
