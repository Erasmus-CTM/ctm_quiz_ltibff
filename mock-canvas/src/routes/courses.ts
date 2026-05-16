import { Router } from "express";
import { courses, assignments, submissions } from "../data/seed";

const router = Router();

// GET /api/v1/courses
router.get("/", (_req, res) => {
    res.json(courses);
});

// GET /api/v1/courses/:courseId
router.get("/:courseId", (req, res) => {
    const course = courses.find((c) => c.id === Number(req.params.courseId));
    if (!course) return res.status(404).json({ errors: [{ message: "Course not found" }] });
    res.json(course);
});

// GET /api/v1/courses/:courseId/assignments
router.get("/:courseId/assignments", (req, res) => {
    const courseId = Number(req.params.courseId);
    res.json(assignments.filter((a) => a.course_id === courseId));
});

// GET /api/v1/courses/:courseId/assignments/:assignmentId
router.get("/:courseId/assignments/:assignmentId", (req, res) => {
    const assignment = assignments.find(
        (a) =>
            a.course_id === Number(req.params.courseId) &&
            a.id === Number(req.params.assignmentId)
    );
    if (!assignment) return res.status(404).json({ errors: [{ message: "Assignment not found" }] });
    res.json(assignment);
});

// GET /api/v1/courses/:courseId/assignments/:assignmentId/submissions/:userId
router.get("/:courseId/assignments/:assignmentId/submissions/:userId", (req, res) => {
    const sub = submissions.find(
        (s) =>
            s.assignment_id === Number(req.params.assignmentId) &&
            s.user_id === Number(req.params.userId)
    );
    if (!sub) return res.status(404).json({ errors: [{ message: "Submission not found" }] });
    res.json(sub);
});

// POST /api/v1/courses/:courseId/assignments/:assignmentId/submissions
// Grade passback from the BFF (AGS-style simplified)
router.post("/:courseId/assignments/:assignmentId/submissions", (req, res) => {
    const assignmentId = Number(req.params.assignmentId);
    const { user_id, score } = req.body;

    if (user_id === undefined || score === undefined) {
        return res.status(422).json({ errors: [{ message: "user_id and score are required" }] });
    }

    let sub = submissions.find(
        (s) => s.assignment_id === assignmentId && s.user_id === Number(user_id)
    );

    const assignment = assignments.find((a) => a.id === assignmentId);
    const grade = assignment ? `${Math.round((score / assignment.points_possible) * 100)}%` : `${score}`;

    if (sub) {
        sub.score = score;
        sub.grade = grade;
        sub.submitted_at = new Date().toISOString();
        sub.workflow_state = "graded";
    } else {
        // Create on the fly if student isn't in seed data
        sub = {
            id: Date.now(),
            assignment_id: assignmentId,
            user_id: Number(user_id),
            score,
            grade,
            submitted_at: new Date().toISOString(),
            workflow_state: "graded",
        };
        submissions.push(sub);
    }

    res.status(201).json(sub);
});

export default router;