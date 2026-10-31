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

The repository includes deployment configuration for a Render API and a Vercel frontend. Both connect to the same GitHub repository. Render uses the root workspace and starts only the server; Vercel builds the client bundle and applies SPA routing for refreshed case URLs.

### Deploy the API to Render

1. In Render, create a **Blueprint** and select this GitHub repository. Render reads `render.yaml` and creates the API web service.
2. Add these values when prompted, or in the service's **Environment** settings: `MONGODB_URI` (your Atlas connection string), `GEMINI_API_KEY` (a rotated Gemini key), and `CLIENT_URL` (use `http://localhost:5173` temporarily, then replace it with the Vercel site origin after Vercel assigns one).
3. Wait for the service to deploy. Its health endpoint is `/api/health`; note the service's `https://…onrender.com` base URL.

### Deploy the frontend to Vercel

1. Import this GitHub repository into Vercel.
2. Keep the project root at the repository root (`.`). Use the included `vercel.json`: install command `npm ci`, build command `npm run build`, output directory `client/dist`.
3. Add the public environment variable `VITE_API_BASE_URL` with the Render API URL plus `/api`, for example `https://your-api.onrender.com/api`.
4. Deploy and note the Vercel production origin (for example `https://your-app.vercel.app`). Set that exact origin as Render's `CLIENT_URL`, then redeploy the API.

The Gemini key and MongoDB URI belong on Render only, never on Vercel or in Git. Keep all real credentials out of `.env.example` and GitHub. For Atlas access, add the Render service's outbound IP ranges (shown under **Connect → Outbound** in Render) to the Atlas project's IP access list. Free hosting plans may sleep when idle, so the first request after inactivity can take longer. Add a generation rate limit and review your provider's current pricing/limits before a public launch.
