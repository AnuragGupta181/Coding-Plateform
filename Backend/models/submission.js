const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  candidateEmail: { 
    type: String, 
    required: true 
  },
  candidateName: {
    type: String
  },
  testId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Test', 
    required: true 
  },
  // Map allows O(1) access to answers by questionId
  // Format: { "question_id": "selected_option_index" }
  answers: {
    type: Map,
    of: Number,
    default: {}
  },
  // Format: { "question_id": { sourceCode, language, score, verdict } }
  codingAnswers: {
    type: Map,
    of: new mongoose.Schema({
      sourceCode: String,
      language: String,
      score: Number,
      verdict: String,
      passed: Number,
      total: Number,
      aiAnalysis: String,
      testCaseResults: [{
        passed: Boolean,
        actualOutput: String,
        error: String
      }]
    }, { _id: false }),
    default: {}
  },
  score: {
    type: Number,
    default: 0
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'completed'],
    default: 'active'
  },
  completedAt: {
    type: Date,
    default: null
  },
  violations: [{
    type: { type: String, enum: ['tab_switch', 'window_blur', 'fullscreen_exit'] },
    timestamp: { type: Date },
    count: { type: Number }
  }]
}, { timestamps: true });

// Unique compound index: one submission per user per test
submissionSchema.index({ candidateEmail: 1, testId: 1 }, { unique: true });

// Compound index for fast lookups of active submissions by test (used heavily in auto-submit)
submissionSchema.index({ testId: 1, status: 1 });

module.exports = mongoose.model('Submission', submissionSchema);
