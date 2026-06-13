import { Provider as Lti, IdToken } from "ltijs";

interface ScorePayload {
  scoreGiven: number;
  scoreMaximum: number;
  /** Defaults to "completed" */
  activityProgress?: string;
  /** Defaults to "FullyGraded" */
  gradingProgress?: string;
}

/**
 * Post a score back to Canvas using ltijs's built-in AGS helper.
 *
 * ltijs handles:
 *   - fetching an access token from Canvas
 *   - finding the correct lineitem for this resource link
 *   - formatting the Score object per the LTI-AGS spec
 */
export async function postScore(token: IdToken, payload: ScorePayload): Promise<void> {
  const {
    scoreGiven,
    scoreMaximum,
    activityProgress = "Completed",
    gradingProgress = "FullyGraded",
  } = payload;

  const score = {
    userId: token.user,
    scoreGiven,
    scoreMaximum,
    activityProgress,
    gradingProgress,
    timestamp: new Date().toISOString(),
  };

  // Grade.scoreGrades() finds the lineitem automatically from the resource link
  const result = await Lti.Grade.scoreGrades(token, score);

  if (!result) {
    throw new Error("Canvas AGS returned no result — check lineitem configuration");
  }
}
