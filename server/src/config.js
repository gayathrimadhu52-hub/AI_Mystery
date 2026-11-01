export const PORT = Number(process.env.PORT || 5000);
export const MONGODB_URI = process.env.MONGODB_URI;
export const CLIENT_URL = process.env.CLIENT_URL || (process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:5173');
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
export const CASE_RETENTION_DAYS = 30;
export const DIFFICULTIES = {
  easy: { suspects: 3, clues: 5, hints: 2, basePoints: 100 },
  medium: { suspects: 4, clues: 7, hints: 3, basePoints: 150 },
  hard: { suspects: 5, clues: 9, hints: 3, basePoints: 200 },
};
