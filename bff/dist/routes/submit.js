"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitRoute = submitRoute;
const express_1 = require("express");
const ltijs_1 = __importDefault(require("ltijs"));
const ags_1 = require("../canvas/ags");
function submitRoute() {
    const router = (0, express_1.Router)();
    /**
     * POST /api/submit
     *
     * Body: { correct: number, total: number }
     *
     * The quiz frontend calls this after the student finishes.
     * ltijs middleware (idToken) has already validated the LTI session.
     */
    router.post("/submit", ltijs_1.default.protect(), async (req, res) => {
        const token = res.locals.token;
        // ── Validate body ──────────────────────────────────────────────────────
        const { correct, total } = req.body;
        if (typeof correct !== "number" ||
            typeof total !== "number" ||
            total <= 0 ||
            correct < 0 ||
            correct > total) {
            return res.status(400).json({
                error: "Body must be { correct: number, total: number } with 0 ≤ correct ≤ total > 0",
            });
        }
        // ── Convert to Canvas score ────────────────────────────────────────────
        // Canvas AGS expects a score in [0, pointsPossible].
        // We normalise to a percentage (0–100) which maps cleanly to any assignment.
        const scoreGiven = (correct / total) * 100;
        const scoreMaximum = 100;
        console.log(`[submit] user=${token.user} correct=${correct} total=${total} score=${scoreGiven.toFixed(1)}`);
        // ── Post to Canvas via AGS ─────────────────────────────────────────────
        try {
            await (0, ags_1.postScore)(token, { scoreGiven, scoreMaximum });
            return res.json({
                ok: true,
                score: scoreGiven,
                scoreMaximum,
                percentage: `${scoreGiven.toFixed(1)}%`,
            });
        }
        catch (err) {
            console.error("[submit] AGS error:", err);
            return res.status(502).json({ error: "Failed to post score to Canvas" });
        }
    });
    return router;
}
