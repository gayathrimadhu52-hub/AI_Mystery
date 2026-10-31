import { GoogleGenAI } from '@google/genai';
import { GEMINI_API_KEY, GEMINI_MODEL, DIFFICULTIES } from './config.js';
import { validateGenerated } from './validation.js';

const modelSchema = {
  type: 'OBJECT', propertyOrdering: ['title', 'story', 'suspects', 'clues', 'hints', 'culpritId', 'solutionExplanation'],
  properties: {
    title: { type: 'STRING' }, story: { type: 'STRING' },
    suspects: { type: 'ARRAY', items: { type: 'OBJECT', propertyOrdering: ['id', 'name', 'description', 'motive', 'alibi'], properties: { id: { type: 'STRING' }, name: { type: 'STRING' }, description: { type: 'STRING' }, motive: { type: 'STRING' }, alibi: { type: 'STRING' } }, required: ['id', 'name', 'description', 'motive', 'alibi'] } },
    clues: { type: 'ARRAY', items: { type: 'OBJECT', propertyOrdering: ['id', 'text', 'explanation'], properties: { id: { type: 'STRING' }, text: { type: 'STRING' }, explanation: { type: 'STRING' } }, required: ['id', 'text', 'explanation'] } },
    hints: { type: 'ARRAY', items: { type: 'STRING' } }, culpritId: { type: 'STRING' }, solutionExplanation: { type: 'STRING' },
  }, required: ['title', 'story', 'suspects', 'clues', 'hints', 'culpritId', 'solutionExplanation'],
};
const correction = (error) => `The previous result failed validation: ${error.message}. Generate a completely corrected JSON result, following the exact schema, counts, IDs, bounds, and logical constraints. Return JSON only.`;
export async function generateCase({ premise, difficulty }) {
  if (!GEMINI_API_KEY) throw new Error('AI service is not configured.');
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const counts = DIFFICULTIES[difficulty];
  const instructions = `Create a compelling, fair-play fictional deduction mystery for a single player. Premise: ${premise}\nDifficulty: ${difficulty}. Exact counts: ${counts.suspects} suspects, ${counts.clues} clues, ${counts.hints} hints. IDs must be unique short URL-safe strings; culpritId must identify exactly one suspect. Story must be 100-8000 chars. Give every suspect a distinct plausible motive and alibi. Clues must support one logically consistent culprit and a correct accusation; no contradictions without an explained resolution. Hints should progressively guide reasoning without directly naming the culprit. Keep clue text discoverable and its explanation private until results. Return only valid JSON conforming to the response schema.`;
  let prompt = instructions;
  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL, contents: prompt,
        config: { responseMimeType: 'application/json', responseSchema: modelSchema, temperature: 0.8, httpOptions: { timeout: 45000 } },
      });
      const parsed = JSON.parse(response.text || '');
      return validateGenerated(parsed, difficulty);
    } catch (error) {
      lastError = error;
      if (attempt === 0) { prompt = `${instructions}\n\n${correction(error)}`; continue; }
    }
  }
  console.error('Mystery generation failed after correction attempt:', lastError?.name || 'UnknownError');
  const failure = new Error('The mystery generator could not create a valid case. Please try again.');
  failure.status = 502;
  throw failure;
}
