import mongoose from 'mongoose';

const suspectSchema = new mongoose.Schema({
  id: { type: String, required: true }, name: { type: String, required: true },
  description: { type: String, required: true }, motive: { type: String, required: true }, alibi: { type: String, required: true },
}, { _id: false });
const clueSchema = new mongoose.Schema({
  id: { type: String, required: true }, text: { type: String, required: true }, explanation: { type: String, required: true },
}, { _id: false });
const resultSchema = new mongoose.Schema({
  correct: Boolean, score: Number, basePoints: Number, cluePoints: Number, hintPenalty: Number,
  uniqueCluesDiscovered: Number, completedAt: Date,
}, { _id: false });
const caseSchema = new mongoose.Schema({
  schemaVersion: { type: Number, default: 1 }, premise: { type: String, required: true }, title: { type: String, required: true },
  story: { type: String, required: true }, difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
  suspects: { type: [suspectSchema], required: true }, clues: { type: [clueSchema], required: true }, hints: { type: [String], required: true },
  culpritId: { type: String, required: true }, solutionExplanation: { type: String, required: true },
  discoveredClueIds: { type: [String], default: [] }, hintsUsed: { type: Number, default: 0 },
  accusation: { suspectId: String, submittedAt: Date }, result: { type: resultSchema, default: null },
  status: { type: String, enum: ['active', 'completed'], default: 'active' },
}, { timestamps: true, versionKey: false });
caseSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
export const Case = mongoose.model('Case', caseSchema);
