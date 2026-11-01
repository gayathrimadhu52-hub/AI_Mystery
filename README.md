# AI Mystery Room

A single-player deduction game powered by Gemini. The server owns case state, clue and hint progress, solution privacy, and scoring.

## Requirements

- Node.js 20.x or 22.x
- MongoDB (local or Atlas)
- Gemini API key

## Local setup

1. Copy `server/.env.example` to `server/.env` and set `MONGODB_URI` and `GEMINI_API_KEY`.
2. Install dependencies from the repository root with `npm install`.
3. Start both apps with `npm run dev`.
4. Open `http://localhost:5173` (API runs on `http://localhost:5000`).

The frontend reads `VITE_API_BASE_URL` (defaults to `http://localhost:5000/api` during development). For production, configure it to the deployed API URL including `/api`. Configure `CLIENT_URL` to the exact frontend origin on the backend.

## Deployment

The repository includes deployment configuration for a Render API and a Vercel frontend. Follow [DEPLOYMENT.md](DEPLOYMENT.md) for the full setup, environment variables, deployment, and verification steps.

## Design notes

- API serializers construct allowlisted public responses. Clue text is returned only after discovery; clue explanations, motives, alibis, culprit and solution stay server-side until results.
- Scoring is computed and finalized by the backend: correct-answer base points + 5 per unique discovered clue − 10 per hint, with a zero minimum.
- Anonymous cases expire after 30 days. No case history or personal data is collected.
- Gemini output uses a structured JSON schema and receives one correction attempt if it fails validation.
- The Gemini key and MongoDB URI belong on the server only. Keep real credentials out of `.env.example`, Vercel, and Git.
