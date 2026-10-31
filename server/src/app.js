import express from 'express';
import cors from 'cors';
import { CLIENT_URL } from './config.js';
import { casesRouter } from './cases.js';

export const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: CLIENT_URL }));
app.use(express.json({ limit: '16kb' }));
app.get('/api/health', (_req, res) => res.json({ data: { status: 'ok' }, error: null }));
app.use('/api/cases', casesRouter);
app.use((_req, res) => res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'We could not find that page.', details: [] } }));
app.use((error, _req, res, _next) => {
  console.error('Request failed:', error?.name || 'Error');
  const status = error.status && error.status >= 400 && error.status < 600 ? error.status : 500;
  const code = status === 413 ? 'REQUEST_TOO_LARGE' : 'INTERNAL_ERROR';
  const message = status === 413 ? 'The request is too large.' : 'Something went wrong. Please try again.';
  res.status(status).json({ data: null, error: { code, message, details: [] } });
});
