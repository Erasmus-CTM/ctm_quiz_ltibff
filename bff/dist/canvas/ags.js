"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.postScore = postScore;
const ltijs_1 = __importDefault(require("ltijs"));
/**
 * Post a score back to Canvas using ltijs's built-in AGS helper.
 *
 * ltijs handles:
 *   - fetching an access token from Canvas
 *   - finding the correct lineitem for this resource link
 *   - formatting the Score object per the LTI-AGS spec
 */
async function postScore(token, payload) {
    const { scoreGiven, scoreMaximum, activityProgress = "Completed", gradingProgress = "FullyGraded", } = payload;
    const score = {
        userId: token.user,
        scoreGiven,
        scoreMaximum,
        activityProgress,
        gradingProgress,
        timestamp: new Date().toISOString(),
    };
    // Grade.scoreGrades() finds the lineitem automatically from the resource link
    const result = await ltijs_1.default.Grade.scoreGrades(token, score);
    if (!result) {
        throw new Error("Canvas AGS returned no result — check lineitem configuration");
    }
}
