# AI Mystery Room — Product and Technical Specification

**Document status:** Implementation blueprint  
**Product type:** AI-assisted, single-player web mystery game  
**Stack:** React, Vite, Tailwind CSS, Node.js, Express, MongoDB, Mongoose, Gemini API

## 1. Product overview

AI Mystery Room lets a player provide a premise and investigate an original mystery generated with Gemini. The player reviews the story and suspects, discovers evidence, optionally requests hints, then accuses one suspect. The server evaluates the accusation and returns the culprit, explanation, and score.

### Problem statement

Players need a guided, replayable mystery-solving experience. The application should turn a short premise into a structured case, let the player investigate through a clear interface, and fairly assess the final accusation.

### Goals

- Generate playable mysteries at Easy, Medium, and Hard levels.
- Keep the culprit and solution private until an accusation is submitted.
- Make investigation progress and scoring understandable.
- Handle invalid AI output and service failures without exposing secrets or corrupting case state.
- Work responsively on desktop and mobile and support a complete deployed playthrough.

### Out of scope for the initial release

- Accounts, profiles, multiplayer, leaderboards, social sharing, and persistent cross-device history.
- User-authored or community-published cases.
- Payments, ads, moderation dashboards, and arbitrary follow-up chat with the AI.
- Guaranteed factual accuracy: cases are fictional and generated for entertainment.

## 2. Users and experience

**Target users:** People who enjoy short deduction games, students demonstrating full-stack and AI integration skills, and evaluators reviewing a deployed project.

**Expected experience:** A player can start without an account, enter a premise, select a difficulty, and reach an investigation room after generation. The room makes available actions and progress clear. The player may use hints, inspect/discover clues, and submit one accusation. Results explain the outcome and score, then allow a new case.

## 3. Scope and requirements

### Required features

1. Home page introducing the game with a prominent start action.
2. Case creation form with premise input and difficulty selection.
3. AI-generated title, narrative, suspects, clues, hints, culprit, and solution explanation in a validated structured format.
4. Investigation room showing the narrative, suspect cards, and undiscovered/discovered clue states.
5. Hint requests with visible usage and score impact.
6. Accusation form listing suspects and preventing empty or repeated submission.
7. Results view with verdict, culprit, explanation, score breakdown, and new-case action.
8. Backend-owned case state, validation, solution, and score calculation.
9. Loading, empty, not-found, validation, and service-error states.
10. Responsive layout and accessible form controls, labels, keyboard navigation, and status announcements.

### Optional enhancements (after required flow works)

- Case history in the current browser session.
- Copy/share a result summary without revealing a solution for an active case.
- Animated transitions, sound, and theme toggle.
- Rate limits and abuse monitoring for public deployments.
- Automated tests and structured operational logging.

## 4. User flow

1. Player opens Home and selects **Start a Mystery**.
2. Player enters a premise and chooses Easy, Medium, or Hard.
3. Client validates required input and sends a case-generation request.
4. Server validates input, asks Gemini for structured case data, validates the result, and stores the case. The solution remains server-side.
5. Client navigates to the Investigation Room using the returned case ID and public case data.
6. Player reads the story and suspects, then discovers clues. The server records unique discoveries and updates progress.
7. Player may request hints. Each response returns the next eligible hint and updates hint usage.
8. Player chooses one suspect and submits an accusation.
9. Server checks the accusation, computes and persists the score, marks the case complete, and returns the result and explanation.
10. Player reviews results and starts another mystery.

## 5. Screens and interaction requirements

### Home

- Product name, concise premise, how-to-play summary, and **Start a Mystery** button.
- Responsive header and primary content; button navigates to Create Mystery.

### Create Mystery

- Premise text area (required, 20–500 characters after trimming).
- Difficulty selector with descriptions; default Medium.
- Submit button disabled during generation; show progress text while waiting.
- Inline validation for empty/too-short/too-long input. On API failure, preserve entered data and provide retry guidance.

### Investigation Room

- Case title, difficulty, narrative, and progress (clues found/total, hints used/available).
- Suspect cards with names and public descriptions; never include solution-bearing fields.
- Clue list with discover action for each available clue. Discovered clue content is shown; undiscovered content may be represented by a neutral label and must not be sent to the client before discovery.
- Hint action returns the next hint, updates remaining count and score preview. If exhausted, explain that no hints remain.
- Accusation action leads to or reveals a suspect selection form. A case cannot be modified after completion.
- Loading indicators for individual actions; prevent duplicate submissions while a request is pending.

### Accusation

- Select exactly one listed suspect and confirm submission.
- Require an explicit selection. Explain that submission ends the investigation.
- Disable repeated submissions while pending; handle stale or already-completed cases with a link to results.

### Results

- Correct/incorrect verdict, selected suspect, actual culprit, explanation, final score, and score breakdown.
- **Start Another Mystery** returns to Create Mystery or Home and does not mutate the completed case.
- Results endpoint is available only after completion.

### Shared behavior and accessibility

- Persistent navigation back to Home where safe; navigation must not expose hidden solution data.
- Use semantic headings, associated labels, keyboard-operable controls, visible focus, adequate contrast, and accessible error/status announcements.
- Layout adapts to narrow screens without horizontal scrolling; cards and controls remain readable and operable.
- Network failures show a concise message and retry option when retry is safe. Do not automatically repeat accusation or other state-changing requests without an idempotency strategy.

## 6. Difficulty configuration

| Difficulty | Suspects | Clues | Hints | Correct accusation base points |
|---|---:|---:|---:|---:|
| Easy | 3 | 5 | 2 | 100 |
| Medium | 4 | 7 | 3 | 150 |
| Hard | 5 | 9 | 3 | 200 |

Counts are exact. Each case must have one culprit drawn from the suspects and a logically consistent solution supported by the clues. At least one combination of discoverable clues must support the correct culprit; no clue may directly contradict the solution without explanation.

## 7. AI generation contract

### Prompt and output

The server calls Gemini using a server-only API key and requests JSON matching this logical schema (additional fields are rejected unless deliberately added to the versioned schema):

```json
{
  "title": "string",
  "story": "string",
  "suspects": [
    { "id": "string", "name": "string", "description": "string", "motive": "string", "alibi": "string" }
  ],
  "clues": [
    { "id": "string", "text": "string", "explanation": "string" }
  ],
  "hints": ["string"],
  "culpritId": "string",
  "solutionExplanation": "string"
}
```

The backend validates JSON shape and types with Zod (or an equivalent schema validator), trims strings, rejects empty/oversized values, enforces exact difficulty counts, unique IDs, and a `culpritId` matching a suspect. Recommended bounds: title 1–120 chars; story 100–8,000; suspect name 1–80, description/motive/alibi 1–1,000 each; clue text 1–1,500 and explanation 1–1,000; hint 1–1,000; solution explanation 1–4,000. These bounds should be constants shared by request validation and generation validation.

If the provider returns malformed, incomplete, or inconsistent data, do not save or return a playable case. Retry generation at most once with a correction prompt; then return a safe 502-style error. Never return raw provider output, prompt contents, credentials, or stack traces to the client. Do not silently fabricate missing solution fields.

### Public/private response boundary

- Public case data may contain title, story, difficulty, suspect IDs/names/descriptions, clue IDs and discovery status, discovered clue text, counts, hint usage, and status.
- Before discovery, do not return clue text or its explanation. After discovery, return the clue text; clue explanations remain private until results unless the product intentionally changes this rule.
- Never return culprit ID, motive/alibi fields designated private, solution explanation, or correctness data from creation, retrieval, discovery, or hint endpoints.
- Hints may aid deduction but must not reveal the culprit outright. Validate generated hint count and reject hints that include private answer fields where feasible.
- Return the solution explanation and culprit only after a valid accusation completes the case. Do not embed private fields in HTML, JavaScript bundles, logs sent to the client, or client-side state before then.

## 8. Scoring rules

Score calculation is authoritative on the backend:

`score = max(0, basePoints + 5 × uniqueCluesDiscovered − 10 × hintsUsed)`

`basePoints` is the difficulty's correct-accusation award if the accusation matches the culprit; otherwise it is 0. Thus an incorrect accusation can still earn clue points, less hint penalties, with a minimum of 0. Each clue is counted at most once. Hint use is counted once per successfully returned hint. Score is finalized at accusation time and cannot be changed afterward. The client may show an estimate but must never submit a score value.

## 9. Backend architecture and API

Use Express JSON APIs under `/api`. MongoDB via Mongoose persists case state. Set CORS to the configured client origin, use environment variables, validate all request params/body, and return consistent errors. Generate opaque IDs for cases and use server-side timestamps. Suggested response envelope:

```json
{ "data": {}, "error": null }
```

Errors use `{ "data": null, "error": { "code": "VALIDATION_ERROR", "message": "Human-readable message", "details": [] } }`. Do not expose internal exceptions or secrets.

### `POST /api/cases`

Generate a case.

Request:

```json
{ "premise": "A locked greenhouse...", "difficulty": "medium" }
```

Validation: premise trimmed to 20–500 chars; difficulty exactly `easy`, `medium`, or `hard`.

Success `201` returns `{ "data": { "case": <public case> }, "error": null }`. Provider timeout/failure or invalid generated output returns safe `502`/`503`. Invalid input returns `400`.

### `GET /api/cases/:id`

Retrieve active public case state, including discovered clues only, counts, hint usage, and case status. Return `404` for unknown ID. Never return solution fields. A completed case may return its public state, but solution details are fetched from the result endpoint.

### `POST /api/cases/:id/clues/:clueId/discover`

Discover a clue once. Return the updated public case state and the requested clue text. Unknown case/clue returns `404`; completed case returns `409`. Repeated discovery is idempotent and does not add points twice.

### `POST /api/cases/:id/hints`

Request the next unused hint. Return `{ "data": { "hint": "...", "hintsUsed": 1, "hintsRemaining": 1, "scorePreview": 0 }, "error": null }`. Exhausted hints returns `409` with code `HINTS_EXHAUSTED`. Completed case returns `409`.

### `POST /api/cases/:id/accuse`

Request: `{ "suspectId": "suspect-1" }`. Validate that the suspect belongs to the case and the case is active. One accusation completes the case. Response includes verdict, culprit ID/name, solution explanation, chosen suspect ID, final score and breakdown. A repeated request should return the already finalized result (idempotent) or a documented `409`; it must never alter the result.

### `GET /api/cases/:id/result`

Return result only if the case is completed; otherwise return `409` with code `CASE_NOT_COMPLETE`. Unknown case returns `404`. Do not accept client-supplied score or verdict.

### Common operational rules

- Use `400` for invalid input, `404` for unknown resources, `409` for invalid state transitions, `429` for rate limiting when enabled, `500` for unexpected server errors, and `502`/`503` for upstream AI failures.
- Configure request size limits and reasonable AI timeouts. Avoid logging premises or generated narrative unless necessary; never log API keys or private solution payloads.
- State-changing actions must be atomic or guarded against duplicate requests. Use conditional updates/transactions where needed so clue counts, hint counters, and accusation state cannot race.
- Add rate limits on case generation for public deployment. Do not trust client-provided case state, discovered clue IDs, hint count, culprit, or score.

## 10. Data model

Suggested Mongoose `Case` document:

```text
Case {
  _id: ObjectId,
  schemaVersion: Number,
  premise: String,
  title: String,
  story: String,
  difficulty: "easy" | "medium" | "hard",
  suspects: [{ id, name, description, motive, alibi }],
  clues: [{ id, text, explanation }],
  hints: [String],
  culpritId: String,                 // private
  solutionExplanation: String,      // private
  discoveredClueIds: [String],
  hintsUsed: Number,
  accusation: { suspectId, submittedAt } | null,
  result: { correct, score, basePoints, cluePoints, hintPenalty, completedAt } | null,
  status: "active" | "completed",
  createdAt: Date,
  updatedAt: Date
}
```

The collection is server-only; API serializers must explicitly construct allowlisted public responses rather than serializing the Mongoose document. Do not store Gemini credentials in the database. Add TTL cleanup (for example, delete abandoned cases after 30 days) if long-term retention is not needed, and document the chosen retention period before production launch.

## 11. Frontend and backend implementation

### Frontend

- Vite + React, React Router, Axios, Tailwind CSS.
- Suggested routes: `/`, `/create`, `/cases/:id`, `/cases/:id/accuse`, `/cases/:id/result`.
- Keep only public case state in browser memory/state. Store the case ID for navigation; do not persist hidden solution data.
- Configure API base URL via a public frontend environment variable. It must not contain Gemini or database credentials.
- Handle route refresh by fetching the case from the backend. Show a not-found or expired case message when unavailable.

### Backend

- Node.js + Express, Mongoose, `@google/genai`, `zod`, `cors`, `dotenv`.
- Suggested modules: app/server setup, database connection, case model, case routes/controllers, Gemini service, validation schemas, public serializers, scoring utility, centralized error middleware.
- Keep `.env` out of version control. Provide `.env.example` with placeholders only.

### Local setup

Frontend:

```bash
npm create vite@latest client -- --template react
cd client
npm install
npm install react-router-dom axios
npm install -D tailwindcss @tailwindcss/vite
```

Backend:

```bash
mkdir server && cd server
npm init -y
npm install express cors dotenv mongoose @google/genai zod
npm install --save-dev nodemon
```

Backend environment variables (`server/.env`, never commit real values):

```dotenv
PORT=5000
MONGODB_URI=your_mongodb_connection_string
GEMINI_API_KEY=your_gemini_api_key
CLIENT_URL=http://localhost:5173
```

## 12. Error and loading states

- Case generation: show an in-progress state; on failure preserve premise/difficulty and allow retry.
- Case retrieval: distinguish loading, expired/not found, and temporary network failure.
- Clue discovery/hint use: show per-action progress and update state only from server response; prevent duplicate actions while pending.
- Accusation: show submission state; on timeout, fetch case/result before retrying to avoid duplicate completion.
- Results: if case is still active, explain that an accusation is required; if not found/expired, offer a new case.
- All errors should be actionable and human-readable; details intended for developers belong in server logs, not client responses.

## 13. Security, privacy, and reliability

- Keep Gemini API key and MongoDB URI only on the server; never commit secrets.
- Enforce the solution privacy boundary through explicit serializers and endpoint tests/reviews.
- Validate input and generated content at trust boundaries; escape/render AI text safely as text (do not render generated HTML).
- Restrict CORS to the deployed frontend origin, use HTTPS in production, apply request limits and generation rate limits, and keep dependencies maintained.
- Handle MongoDB and Gemini errors without leaking provider payloads, secrets, or stack traces.
- Establish a retention policy for saved premises and cases; avoid collecting personal data in the initial anonymous flow.

## 14. Testing and acceptance criteria

The project is complete when all of the following are true:

1. A user can create cases at all three difficulties, with the exact required suspect, clue, and hint counts.
2. Invalid premises/difficulties are rejected with useful validation errors.
3. Invalid or malformed AI output is not saved or exposed as a playable case.
4. The public API and browser responses do not expose culprit, solution explanation, or undiscovered clue content before accusation.
5. Players can discover clues, and repeated discoveries do not increase score twice.
6. Players can request the allowed number of hints; each successful hint is counted once and excess requests are rejected.
7. A valid accusation completes the case exactly once; invalid suspect IDs and invalid state transitions are rejected.
8. Backend score calculation follows the documented formula for correct and incorrect accusations, clue discoveries, hint penalties, and the zero minimum.
9. Results show the correct verdict, culprit, explanation, and score breakdown only after completion.
10. Refreshing an active case reloads public state without revealing private fields.
11. Loading, not-found, validation, provider failure, and network error states are handled gracefully.
12. The interface is usable on desktop and mobile and supports keyboard navigation.
13. Production frontend, backend, MongoDB, and Gemini environment configuration work together for a complete live mystery-solving flow.
14. The submitted GitHub repository contains source and setup documentation but no secrets; the deployed URL supports creating and solving a case.

Recommended verification includes unit checks for schema validation/scoring, API checks for state transitions/privacy, and a manual end-to-end playthrough at each difficulty. Test invalid AI responses and provider/database outages before deployment.

## 15. Deployment and final submission

- Provision MongoDB Atlas and a Node-compatible backend host; set `MONGODB_URI`, `GEMINI_API_KEY`, `CLIENT_URL`, and `PORT` in the backend host's environment settings.
- Deploy the React/Vite frontend to Vercel; set its public API base URL to the deployed backend.
- Configure production CORS to the exact frontend origin and use HTTPS.
- Verify the deployed app end to end, including all difficulties, clue and hint actions, accusation, result, refresh behavior, and failure messages.
- Submit the GitHub repository URL, live website URL, and a demonstrated mystery-solving experience on the live website.

## 16. Delivery phases

1. Finalize this specification before implementation.
2. Create separate `client` and `server` applications and configure local environment variables.
3. Implement database connection, model, API validation, Gemini generation, privacy serializers, and scoring.
4. Implement screens and connect them to the API incrementally.
5. Verify acceptance criteria and failure states.
6. Deploy backend/database and frontend, configure production environment, and complete a live playthrough.
