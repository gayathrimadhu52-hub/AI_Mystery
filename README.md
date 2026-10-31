# AI Mystery Room

A single-player deduction game powered by Gemini. The server owns case state, clue and hint progress, solution privacy, and scoring.

## Requirements

- Node.js 20+
- MongoDB (local or Atlas)
- Gemini API key

## Setup

1. Copy `server/.env.example` to `server/.env` and set `MONGODB_URI` and `GEMINI_API_KEY`.
2. Install dependencies from the repository root: `npm install`.
3. Start both apps: `npm run dev`.
4. Open `http://localhost:5173` (API runs on `http://localhost:5000`).

The frontend reads `VITE_API_BASE_URL` (defaults to `http://localhost:5000/api`). Set it to the deployed API URL when building for production. Configure `CLIENT_URL` to the exact frontend origin on the backend.

## Design notes

- API serializers construct allowlisted public responses. Clue text is returned only after discovery; clue explanations, motives, alibis, culprit and solution stay server-side until results.
- Scoring is computed and finalized by the backend: correct-answer base points + 5 per unique discovered clue − 10 per hint, with a zero minimum.
- Anonymous cases expire after 30 days. No case history or personal data is collected.
- Gemini output uses a structured JSON schema and receives one correction attempt if it fails validation.

## Production

Deploy the Node server and React/Vite frontend separately, configure the environment variables from the example, use HTTPS, and set production CORS to the deployed frontend origin. Add a generation rate limit before exposing the API publicly.
