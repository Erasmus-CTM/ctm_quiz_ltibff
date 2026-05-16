import { Router } from "express";
import { users } from "../data/seed";

const router = Router();

// GET /api/v1/users/self  — used by BFF after LTI launch to get current user
router.get("/self", (req, res) => {
    // In real Canvas this is derived from the OAuth token.
    // Here we read a simple header: X-Mock-User-Id
    const userId = Number(req.headers["x-mock-user-id"] ?? 1);
    const user = users.find((u) => u.id === userId) ?? users[0];
    res.json(user);
});

// GET /api/v1/users/:userId
router.get("/:userId", (req, res) => {
    const user = users.find((u) => u.id === Number(req.params.userId));
    if (!user) return res.status(404).json({ errors: [{ message: "User not found" }] });
    res.json(user);
});

export default router;