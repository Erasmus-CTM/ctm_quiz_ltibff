import { Router, Request, Response } from "express";
import { Provider as lti } from "ltijs";

interface PyExResult {

  label: string
  caption?: string
  code?: string
  result: { passed: number, total: number, tests?: boolean[] } | null
}
interface PyExerciseSubmission {
  exercises: PyExResult[]
}

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
    const b = req.body as { correct?: unknown; total?: unknown };
    const correct = Number(b.correct)
    const total = Number(b.total)

    if (
      typeof correct !== "number" ||
      typeof total !== "number" ||
      total <= 0 ||
      correct < 0 ||
      correct > total
    ) {
      return res.status(400).json({
        error: "Body must be { correct: number, total: number } with 0 <= correct <= total > 0",
      });
    }

    // Canvas AGS expects a score in [0, pointsPossible].
    // normalize to a percentage
    const scoreGiven = (correct / total) * 100;
    const scoreMaximum = 100;

    console.log(
      `[submit-dummy] user=${token.user} correct=${correct} total=${total} score=${scoreGiven.toFixed(1)}`
    );

    // try {
    //   await postScore(token, { scoreGiven, scoreMaximum });
    //   return res.json({
    //     ok: true,
    //     score: scoreGiven,
    //     scoreMaximum,
    //     percentage: `${scoreGiven.toFixed(1)}%`,
    //   });
    // } catch (err: unknown) {
    //   console.error("[submit] AGS error:", err);
    //   return res.status(502).json({ error: "Failed to post score to Canvas" });
    // }


    try {
      const idtoken = res.locals.token // IdToken
      // Creating Grade object
      const gradeObj = {
        userId: idtoken.user, // needs to be a student on the course
        scoreGiven: scoreGiven,
        scoreMaximum: 100,
        activityProgress: 'Completed',
        gradingProgress: 'FullyGraded'
      }

      // Selecting linetItem ID
      let lineItemId = idtoken.platformContext.endpoint.lineitem // Attempting to retrieve it from idtoken
      if (!lineItemId) {
        const response = await lti.Grade.getLineItems(idtoken, { resourceLinkId: true })
        const lineItems = response.lineItems
        if (lineItems.length === 0) {
          // Creating line item if there is none
          console.log('Creating new line item')
          const newLineItem = {
            scoreMaximum: 100,
            label: 'Grade',
            tag: 'grade',
            resourceLinkId: idtoken.platformContext.resource.id
          }
          const lineItem = await lti.Grade.createLineItem(idtoken, newLineItem)
          lineItemId = lineItem.id
        } else lineItemId = lineItems[0].id
      }

      // Sending Grade
      const responseGrade = await lti.Grade.submitScore(idtoken, lineItemId, gradeObj)
      return res.send(responseGrade)
    } catch (err) {
      console.error("[submit] AGS error:", err.message);
      // response should be stored on the error:
      if (err.response) {
        console.error("Canvas response body:", err.response.body);
        console.error("Canvas status:", err.response.statusCode);
      }
      return res.status(500).send({ err: err.message, body: err.response?.body })
    }
  });


  router.post("/submit", async (req: Request, res: Response) => {
    const token = res.locals.token;
    console.log("content-type:", req.headers["content-type"]);
    console.log("body type:", typeof req.body);
    // Validate 
    const b = req.body as PyExerciseSubmission

    if (!b.exercises) {
      console.log("[ERROR] missing exercises:");
      console.log(b);
    }

    // parsing the schema from quiz 

    let correct = 0;
    let total = 0;



    b.exercises.forEach(e => {
      correct += e.result?.passed ?? 0;
      total += e.result?.total ?? 1;
    });

    const scoreGiven = (correct / total) * 100;

    console.log(
      `[submit] user=${token.user} correct=${correct} total=${total} score=${scoreGiven.toFixed(1)}`
    );


    try {
      const idtoken = res.locals.token // IdToken
      // Creating Grade object
      const gradeObj = {
        userId: idtoken.user, // needs to be a student on the course
        scoreGiven: scoreGiven,
        scoreMaximum: 100,
        activityProgress: 'Completed',
        gradingProgress: 'FullyGraded'
      }

      // Selecting linetItem ID
      let lineItemId = idtoken.platformContext.endpoint.lineitem // Attempting to retrieve it from idtoken
      if (!lineItemId) {
        const response = await lti.Grade.getLineItems(idtoken, { resourceLinkId: true })
        const lineItems = response.lineItems
        if (lineItems.length === 0) {
          // Creating line item if there is none
          console.log('Creating new line item')
          const newLineItem = {
            scoreMaximum: 100,
            label: 'Grade',
            tag: 'grade',
            resourceLinkId: idtoken.platformContext.resource.id
          }
          const lineItem = await lti.Grade.createLineItem(idtoken, newLineItem)
          lineItemId = lineItem.id
        } else lineItemId = lineItems[0].id
      }

      // Sending Grade
      const responseGrade = await lti.Grade.submitScore(idtoken, lineItemId, gradeObj)
      return res.send(responseGrade)
    } catch (err) {
      console.error("[submit] AGS error:", err.message);
      // response should be stored on the error:
      if (err.response) {
        console.error("Canvas response body:", err.response.body);
        console.error("Canvas status:", err.response.statusCode);
      }
      return res.status(500).send({ err: err.message, body: err.response?.body })
    }
  });

  return router;
}