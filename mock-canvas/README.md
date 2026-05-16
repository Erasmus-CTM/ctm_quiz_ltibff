# mock-canvas

A local Express server that mimics the Canvas LMS API surface used by your BFF.
Run it alongside your BFF in development — swap one URL when moving to real Canvas.

## Quick start

```bash
npm install
npm run dev          # ts-node, hot reload friendly
# or
npm run build && npm run pm2:start   # compiled + pm2
```

Server starts on **http://localhost:3001** by default.

---

## Endpoints

### Health
| Method | Path | Notes |
|--------|------|-------|
| GET | `/health` | Returns `{ ok: true }` |

### Courses
| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/v1/courses` | All courses |
| GET | `/api/v1/courses/:id` | Single course |

### Assignments
| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/v1/courses/:courseId/assignments` | All assignments for course |
| GET | `/api/v1/courses/:courseId/assignments/:assignmentId` | Single assignment |

### Submissions (Grade passback)
| Method | Path | Body | Notes |
|--------|------|------|-------|
| GET | `/api/v1/courses/:courseId/assignments/:assignmentId/submissions/:userId` | — | Get submission |
| POST | `/api/v1/courses/:courseId/assignments/:assignmentId/submissions` | `{ user_id, score }` | Write grade |

### Users
| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/v1/users/self` | Pass `X-Mock-User-Id` header to switch user |
| GET | `/api/v1/users/:id` | Single user |

### LTI 1.3 (OIDC)
| Method | Path | Notes |
|--------|------|-------|
| POST | `/lti/authorize` | OIDC login — returns signed `id_token` via redirect |
| GET | `/lti/jwks` | Public keys for BFF token verification |
| GET | `/lti/launch-as?user_id=1&redirect_uri=...` | Browser shortcut to simulate a full LTI launch |

---

## Simulating a launch

Open in your browser (while BFF is running):

```
http://localhost:3001/lti/launch-as?user_id=1&redirect_uri=http://localhost:3000/lti/callback
```

This auto-submits the OIDC form and redirects through to your BFF just like Canvas would.
Change `user_id` to `2` for Bob (student) or `3` for Carol (teacher).

---

## Seed data

Edit `src/data/seed.ts` to add courses, assignments, and users. Submissions are
mutated in memory at runtime — restart the server to reset them.

---

## Moving to real Canvas

In your BFF `.env`, change:

```
# dev
CANVAS_BASE_URL=http://localhost:3001

# prod
CANVAS_BASE_URL=https://yourschool.instructure.com
```

Nothing else should need to change if your BFF reads that variable consistently.