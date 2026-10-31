import { Router } from 'express';
import mongoose from 'mongoose';
import { Case } from './models/Case.js';
import { DIFFICULTIES } from './config.js';
import { accusationSchema, creationSchema } from './validation.js';
import { generateCase } from './gemini.js';

export const casesRouter = Router();
const ok = (res, data, status = 200) => res.status(status).json({ data, error: null });
const fail = (res, status, code, message, details = []) => res.status(status).json({ data: null, error: { code, message, details } });
const publicCase = (doc) => ({
  id: String(doc._id), title: doc.title, story: doc.story, difficulty: doc.difficulty,
  suspects: doc.suspects.map(({ id, name, description }) => ({ id, name, description })),
  clues: doc.clues.map(({ id, text }) => ({ id, ...(doc.discoveredClueIds.includes(id) ? { text, discovered: true } : { discovered: false }) })),
  discoveredClueCount: doc.discoveredClueIds.length, hintsUsed: doc.hintsUsed,
  hintsRemaining: Math.max(0, doc.hints.length - doc.hintsUsed), hintsTotal: doc.hints.length,
  scorePreview: doc.result?.score ?? Math.max(0, (doc.status === 'completed' && doc.result?.correct ? DIFFICULTIES[doc.difficulty].basePoints : 0) + doc.discoveredClueIds.length * 5 - doc.hintsUsed * 10),
  status: doc.status,
});
const resultPayload = (doc) => {
  const suspect = doc.suspects.find((s) => s.id === doc.accusation?.suspectId);
  const culprit = doc.suspects.find((s) => s.id === doc.culpritId);
  return {
    correct: doc.result.correct, chosenSuspectId: doc.accusation.suspectId, chosenSuspectName: suspect?.name || 'Unknown suspect',
    culpritId: doc.culpritId, culpritName: culprit?.name || 'Unknown suspect', solutionExplanation: doc.solutionExplanation,
    score: doc.result.score, basePoints: doc.result.basePoints, cluePoints: doc.result.cluePoints,
    hintPenalty: doc.result.hintPenalty, hintsUsed: doc.hintsUsed, uniqueCluesDiscovered: doc.result.uniqueCluesDiscovered,
  };
};
const validId = (id) => mongoose.isValidObjectId(id);
async function findCase(req, res) {
  if (!validId(req.params.id)) { fail(res, 404, 'NOT_FOUND', 'We could not find that case.'); return null; }
  const doc = await Case.findById(req.params.id);
  if (!doc) { fail(res, 404, 'NOT_FOUND', 'We could not find that case.'); return null; }
  return doc;
}
const zodDetails = (error) => error.issues?.map(({ path, message }) => ({ field: path.join('.'), message })) || [];

casesRouter.post('/', async (req, res, next) => {
  const input = creationSchema.safeParse(req.body);
  if (!input.success) return fail(res, 400, 'VALIDATION_ERROR', 'Enter a premise of 20–500 characters and choose a valid difficulty.', zodDetails(input.error));
  try {
    const generated = await generateCase(input.data);
    const doc = await Case.create({ ...generated, premise: input.data.premise, difficulty: input.data.difficulty });
    return ok(res, { case: publicCase(doc) }, 201);
  } catch (error) {
    if (error.status === 502) return fail(res, 502, 'AI_GENERATION_FAILED', error.message);
    return next(error);
  }
});

casesRouter.get('/:id', async (req, res, next) => {
  try { const doc = await findCase(req, res); if (!doc) return; return ok(res, { case: publicCase(doc) }); }
  catch (error) { return next(error); }
});

casesRouter.post('/:id/clues/:clueId/discover', async (req, res, next) => {
  try {
    let doc = await findCase(req, res); if (!doc) return;
    if (!doc.clues.some((c) => c.id === req.params.clueId)) return fail(res, 404, 'NOT_FOUND', 'That evidence is not part of this case.');
    if (doc.status !== 'active') return fail(res, 409, 'CASE_COMPLETE', 'This investigation is already closed.');
    if (!doc.discoveredClueIds.includes(req.params.clueId)) {
      const update = await Case.updateOne({ _id: doc._id, status: 'active' }, { $addToSet: { discoveredClueIds: req.params.clueId } });
      doc = await Case.findById(doc._id);
      if (!update.modifiedCount && doc.status !== 'active') return fail(res, 409, 'CASE_COMPLETE', 'This investigation is already closed.');
    }
    const clue = doc.clues.find((c) => c.id === req.params.clueId);
    return ok(res, { case: publicCase(doc), clue: { id: clue.id, text: clue.text } });
  } catch (error) { return next(error); }
});

casesRouter.post('/:id/hints', async (req, res, next) => {
  try {
    let doc = await findCase(req, res); if (!doc) return;
    if (doc.status !== 'active') return fail(res, 409, 'CASE_COMPLETE', 'This investigation is already closed.');
    if (doc.hintsUsed >= doc.hints.length) return fail(res, 409, 'HINTS_EXHAUSTED', 'No hints remain for this case.');
    const index = doc.hintsUsed;
    const update = await Case.updateOne({ _id: doc._id, status: 'active', hintsUsed: index }, { $inc: { hintsUsed: 1 } });
    if (!update.modifiedCount) { doc = await Case.findById(doc._id); if (doc.status !== 'active') return fail(res, 409, 'CASE_COMPLETE', 'This investigation is already closed.'); if (doc.hintsUsed >= doc.hints.length) return fail(res, 409, 'HINTS_EXHAUSTED', 'No hints remain for this case.'); return fail(res, 409, 'STATE_CHANGED', 'The case changed. Please request your hint again.'); }
    doc = await Case.findById(doc._id);
    return ok(res, { hint: doc.hints[index], hintsUsed: doc.hintsUsed, hintsRemaining: doc.hints.length - doc.hintsUsed, scorePreview: Math.max(0, doc.discoveredClueIds.length * 5 - doc.hintsUsed * 10) });
  } catch (error) { return next(error); }
});

casesRouter.post('/:id/accuse', async (req, res, next) => {
  const input = accusationSchema.safeParse(req.body);
  if (!input.success) return fail(res, 400, 'VALIDATION_ERROR', 'Select a suspect to submit your accusation.', zodDetails(input.error));
  try {
    let doc = await findCase(req, res); if (!doc) return;
    if (!doc.suspects.some((s) => s.id === input.data.suspectId)) return fail(res, 400, 'INVALID_SUSPECT', 'Choose a suspect listed in this case.');
    if (doc.status === 'completed') return ok(res, { result: resultPayload(doc) });
    const initialDiscovered = doc.discoveredClueIds.length;
    const initialHints = doc.hintsUsed;
    const correct = input.data.suspectId === doc.culpritId;
    const basePoints = correct ? DIFFICULTIES[doc.difficulty].basePoints : 0;
    const cluePoints = initialDiscovered * 5;
    const hintPenalty = initialHints * 10;
    const score = Math.max(0, basePoints + cluePoints - hintPenalty);
    const submittedAt = new Date();
    const update = await Case.findOneAndUpdate(
      { _id: doc._id, status: 'active', hintsUsed: initialHints, $expr: { $eq: [{ $size: '$discoveredClueIds' }, initialDiscovered] } },
      { $set: { status: 'completed', accusation: { suspectId: input.data.suspectId, submittedAt }, result: { correct, score, basePoints, cluePoints, hintPenalty, uniqueCluesDiscovered: initialDiscovered, completedAt: submittedAt } } },
      { new: true },
    );
    if (!update) { doc = await Case.findById(doc._id); if (doc.status === 'completed') return ok(res, { result: resultPayload(doc) }); return fail(res, 409, 'STATE_CHANGED', 'The case changed while you were submitting. Review it and try again.'); }
    return ok(res, { result: resultPayload(update) });
  } catch (error) { return next(error); }
});

casesRouter.get('/:id/result', async (req, res, next) => {
  try { const doc = await findCase(req, res); if (!doc) return; if (doc.status !== 'completed' || !doc.result) return fail(res, 409, 'CASE_NOT_COMPLETE', 'Submit an accusation before viewing the solution.'); return ok(res, { result: resultPayload(doc) }); }
  catch (error) { return next(error); }
});
