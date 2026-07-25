const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctOptionIndex: { type: Number, required: true },
  points: { type: Number, default: 1 }
});

const exampleSchema = new mongoose.Schema({
  input: { type: String, default: '' },
  output: { type: String, default: '' },
  explanation: { type: String, default: '' }
});

const testCaseSchema = new mongoose.Schema({
  input: { type: String, required: true },
  expectedOutput: { type: String, required: true },
  isHidden: { type: Boolean, default: true }
});

const codingQuestionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },   // Supports markdown
  constraints: { type: String, default: '' },
  examples: [exampleSchema],
  testCases: [testCaseSchema],
  allowedLanguages: { type: [String], default: ['javascript', 'python', 'cpp', 'java', 'c'] },
  starterCode: {                                    // { python: "def solve():\n  pass", ... }
    type: Map,
    of: String,
    default: {}
  },
  points: { type: Number, default: 10 },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  order: { type: Number, default: 0 }
});

const testSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  durationInMinutes: { type: Number, required: true },
  testType: {
    type: String,
    enum: ['mcq', 'coding', 'mixed'],
    default: 'mcq'
  },
  status: {
    type: String,
    enum: ['scheduled', 'waiting', 'active', 'completed'],
    default: 'scheduled'
  },
  startedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  scheduledFor: { type: Date, default: null },
  questions: [questionSchema],               // MCQ questions
  codingQuestions: [codingQuestionSchema]    // Coding questions
}, { timestamps: true });

module.exports = mongoose.model('Test', testSchema);

