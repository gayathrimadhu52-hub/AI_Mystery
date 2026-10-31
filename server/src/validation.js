import { z } from 'zod';
import { DIFFICULTIES } from './config.js';

const bounded = (max) => z.string().trim().min(1).max(max);
export const creationSchema = z.object({
  premise: z.string().trim().min(20).max(500), difficulty: z.enum(['easy', 'medium', 'hard']),
}).strict();
export const accusationSchema = z.object({ suspectId: z.string().trim().min(1).max(100) }).strict();
export const generatedCaseSchema = z.object({
  title: bounded(120), story: z.string().trim().min(100).max(8000),
  suspects: z.array(z.object({ id: bounded(80), name: bounded(80), description: bounded(1000), motive: bounded(1000), alibi: bounded(1000) }).strict()),
  clues: z.array(z.object({ id: bounded(80), text: bounded(1500), explanation: bounded(1000) }).strict()),
  hints: z.array(bounded(1000)), culpritId: bounded(80), solutionExplanation: z.string().trim().min(1).max(4000),
}).strict().superRefine((value, ctx) => {
  const suspectIds = value.suspects.map((x) => x.id);
  const clueIds = value.clues.map((x) => x.id);
  if (new Set(suspectIds).size !== suspectIds.length) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Suspect IDs must be unique.' });
  if (new Set(clueIds).size !== clueIds.length) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Clue IDs must be unique.' });
  if (!suspectIds.includes(value.culpritId)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'The culprit must be one of the suspects.' });
});
export function validateGenerated(value, difficulty) {
  const parsed = generatedCaseSchema.parse(value);
  const expected = DIFFICULTIES[difficulty];
  if (parsed.suspects.length !== expected.suspects || parsed.clues.length !== expected.clues || parsed.hints.length !== expected.hints) {
    throw new Error('Generated case counts do not match the selected difficulty.');
  }
  const culpritName = parsed.suspects.find((suspect) => suspect.id === parsed.culpritId).name.toLocaleLowerCase();
  if (parsed.hints.some((hint) => hint.toLocaleLowerCase().includes(culpritName) || hint.toLocaleLowerCase().includes(parsed.culpritId.toLocaleLowerCase()))) {
    throw new Error('A hint directly identifies the culprit.');
  }
  return parsed;
}
