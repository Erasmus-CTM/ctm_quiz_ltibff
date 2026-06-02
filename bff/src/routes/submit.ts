import { Router, Request, Response } from "express";
import { postScore } from "../canvas/ags";

export function submitRoute(): Router {
  const router = Router();

  /**
   * POST /api/submit
   * 
   * For a dummy exercise.
   *
   * Body: { correct: number, total: number }
   *
   * ltijs automatically validates the LTI session on every non-whitelisted
   * route before the request reaches this handler. No explicit protect() call
   * needed — the validated token is simply available on res.locals.token.
   */
  router.post("/submit-dummy", async (req: Request, res: Response) => {
    const token = res.locals.token;

    // Validate 
    const { correct, total } = req.body as { correct?: unknown; total?: unknown };

    if (
      typeof correct !== "number" ||
      typeof total !== "number" ||
      total <= 0 ||
      correct < 0 ||
      correct > total
    ) {
      return res.status(400).json({
        error: "Body must be { correct: number, total: number } with 0 ≤ correct ≤ total > 0",
      });
    }

    // Canvas AGS expects a score in [0, pointsPossible].
    // normalize to a percentage
    const scoreGiven = (correct / total) * 100;
    const scoreMaximum = 100;

    console.log(
      `[submit] user=${token.user} correct=${correct} total=${total} score=${scoreGiven.toFixed(1)}`
    );

    try {
      await postScore(token, { scoreGiven, scoreMaximum });
      return res.json({
        ok: true,
        score: scoreGiven,
        scoreMaximum,
        percentage: `${scoreGiven.toFixed(1)}%`,
      });
    } catch (err: unknown) {
      console.error("[submit] AGS error:", err);
      return res.status(502).json({ error: "Failed to post score to Canvas" });
    }
  });

  return router;
}