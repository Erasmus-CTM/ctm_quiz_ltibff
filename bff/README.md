# quiz-bff

LTI 1.3 backend-for-frontend. Handles the Canvas launch handshake and grade passback.
The quiz frontend is a separate static app — it just calls `POST /api/submit` when done.

## Prerequisites

- Node 18+
- MongoDB (local `mongod` or a free Atlas M0) — required by ltijs for nonce/session storage
- `mock-canvas` running on port 3001 (or a real Canvas instance)

## Quick start

```bash
cp src/.env.example .env   # then edit values
npm install
npm run dev
```

## How it works

```
Student browser
  │
  ├─► Canvas (or mock-canvas) initiates LTI launch
  │       POST /lti/login  (OIDC login hint)
  │       POST /           (id_token delivery)
  │
  ├─► ltijs validates id_token, creates session
  │
  ├─► BFF redirects browser → QUIZ_BASE_URL/?context=...&resource=...
  │
  └─► Quiz runs in browser; on finish:
        POST /api/submit  { correct: 7, total: 10 }
        BFF converts → score 70/100
        BFF posts score to Canvas AGS
        Returns { ok: true, score: 70, percentage: "70.0%" }
```

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | none | Liveness check |
| POST | `/lti/login` | none | OIDC login initiation (ltijs) |
| POST | `/` | LTI | id_token receipt + session creation (ltijs) |
| POST | `/api/submit` | LTI session | Submit quiz result |

## Submit payload

```json
POST /api/submit
Content-Type: application/json

{ "correct": 7, "total": 10 }
```

Response:
```json
{ "ok": true, "score": 70, "scoreMaximum": 100, "percentage": "70.0%" }
```
