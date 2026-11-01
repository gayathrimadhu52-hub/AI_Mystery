# Deployment guide

This project deploys its Express API to Render and its React frontend to Vercel. `render.yaml` and `vercel.json` already contain the host configuration. Both hosts should use the same GitHub repository and production branch.

## 1. Prepare MongoDB and Gemini

1. Create a MongoDB Atlas cluster and a database user with access to the app database. Copy the Atlas connection string, then replace the username, password, and database name as needed. URL-encode special characters in the password.
2. In Atlas **Network Access**, allow the Render service to connect. In Render, open the API service and choose **Connect > Outbound**; add its listed IP ranges to the Atlas project's IP access list. Render services use ranges that can change, so keep the list current. Avoid allowing all IP addresses except as a short-lived diagnostic step. See [Render outbound IPs](https://render.com/docs/outbound-ip-addresses) and [Atlas IP access lists](https://www.mongodb.com/docs/atlas/security/ip-access-list/).
3. Create a Gemini API key. If a credential previously shown in the editor or chat is real, revoke it and use a replacement.

## 2. Configure the Render API

The already-synced Blueprint creates `ai-mystery-room-api`. Open the service in Render and set or verify these values under **Environment**. Render prompts for `sync: false` values when a Blueprint is first created; later Blueprint syncs do not update those values, so manage them in the service settings. See [Render Blueprint environment variables](https://render.com/docs/blueprint-spec#setting-environment-variables).

| Variable | Value |
| --- | --- |
| `MONGODB_URI` | Your Atlas connection string |
| `GEMINI_API_KEY` | Your new Gemini API key |
| `GEMINI_MODEL` | `gemini-2.5-flash` (already set in the Blueprint) |
| `CLIENT_URL` | Your Vercel production origin; set after step 3 |
| `NODE_ENV` | `production` (already set in the Blueprint) |

Do not set `PORT`; Render provides it. Save environment changes and deploy/redeploy the service. Its build command installs production dependencies and its start command starts the server workspace.

When the service shows **Live**, note its hostname, such as `https://ai-mystery-room-api.onrender.com`. Open `https://<render-hostname>/api/health`; a healthy service responds with `{"data":{"status":"ok"},"error":null}`.

## 3. Deploy the frontend to Vercel

1. In Vercel, select **Add New > Project** and import the same GitHub repository and production branch.
2. Set **Root Directory** to the repository root (`.`). The checked-in `vercel.json` configures install command `npm ci`, build command `npm run build`, output directory `client/dist`, and SPA routing.
3. Before deploying, add this environment variable in Vercel:

   | Name | Value | Environments |
   | --- | --- | --- |
   | `VITE_API_BASE_URL` | `https://<render-hostname>/api` | Production; Preview too if preview sites should call the production API |

   Replace the placeholder with the actual Render hostname. Include `/api` and omit the trailing slash. This value is public in the browser bundle. Never put MongoDB credentials or the Gemini key in Vercel.

4. Deploy and copy the production Vercel origin, for example `https://your-project.vercel.app`.

The production frontend build now fails with a clear message if `VITE_API_BASE_URL` is missing.

## 4. Connect Render CORS to Vercel

In Render's **Environment** settings, set `CLIENT_URL` to the exact Vercel origin, with no path or trailing slash (for example, `https://your-project.vercel.app`). Use the custom domain origin instead if that is where people will use the app. Save and redeploy the API. The API allows requests from the configured origin.

## 5. Verify the app

1. Open the Vercel production URL and refresh a case URL to check SPA routing.
2. Create a case to verify the browser can reach the API and the API can reach MongoDB and Gemini.
3. If creation fails, inspect Render **Logs** for database or Gemini errors. For frontend build problems, inspect Vercel **Deployments > Build Logs**. Remove keys, passwords, and connection-string credentials before sharing logs.
4. After changing a Vercel environment variable, redeploy Vercel so the new value is included in the build.

## 6. Publish code changes

Both hosts deploy from Git. Commit and push the code to the connected branch. Vercel normally deploys each pushed commit. If Render automatic deploys are disabled, choose **Manual Deploy > Deploy latest commit**. See [Vercel Git deployments](https://vercel.com/docs/git).

For a local production build, set `VITE_API_BASE_URL` in the shell or an ignored local environment file before running `npm run build`. Local development uses the localhost URL in `client/.env.example`. Keep real credentials out of Git; `.env` files are ignored.
