import { createSlice, type PayloadAction } from '@reduxjs/toolkit';


interface TestState {
  submissionId: string | null;
  testId: string | null;
  currentQuestionIndex: number;
  answers: Record<string, number>; // questionId -> selectedOptionIndex
  viewedQuestionIds: Record<string, boolean>;
  markedQuestionIds: Record<string, boolean>;
  status: 'idle' | 'loading' | 'active' | 'completed' | 'error';
  timeRemaining: number; // in seconds
}

const initialState: TestState = {
  submissionId: null,
  testId: null,
  currentQuestionIndex: 0,
  answers: {},
  viewedQuestionIds: {},
  markedQuestionIds: {},
  status: 'idle',
  timeRemaining: 0,
};

const testSlice = createSlice({
  name: 'test',
  initialState,
  reducers: {
    startTest: (state, action: PayloadAction<{ submissionId: string; testId: string; duration: number; startedAt?: string }>) => {
      state.submissionId = action.payload.submissionId;
      state.testId = action.payload.testId;
      state.currentQuestionIndex = 0;
      state.answers = {};
      state.viewedQuestionIds = {};
      state.markedQuestionIds = {};
      state.status = 'active';

      if (action.payload.startedAt) {
        const startTime = new Date(action.payload.startedAt).getTime();
        const durationMs = action.payload.duration * 60 * 1000;
        const now = Date.now();
        const remainingMs = Math.max(0, startTime + durationMs - now);
        state.timeRemaining = Math.floor(remainingMs / 1000);
      } else {
        state.timeRemaining = action.payload.duration * 60;
      }
    },
    restoreTestSession: (
      state,
      action: PayloadAction<{
        submissionId: string;
        testId: string;
        duration: number;
        startedAt?: string;
        answers: Record<string, number>;
        viewedQuestionIds: Record<string, boolean>;
        markedQuestionIds: Record<string, boolean>;
        currentQuestionIndex: number;
      }>
    ) => {
      state.submissionId = action.payload.submissionId;
      state.testId = action.payload.testId;
      state.answers = action.payload.answers;
      state.viewedQuestionIds = action.payload.viewedQuestionIds;
      state.markedQuestionIds = action.payload.markedQuestionIds;
      state.currentQuestionIndex = action.payload.currentQuestionIndex;
      state.status = 'active';

      if (action.payload.startedAt) {
        const startTime = new Date(action.payload.startedAt).getTime();
        const durationMs = action.payload.duration * 60 * 1000;
        const now = Date.now();
        const remainingMs = Math.max(0, startTime + durationMs - now);
        state.timeRemaining = Math.floor(remainingMs / 1000);
      } else {
        state.timeRemaining = action.payload.duration * 60;
      }
    },
    setAnswer: (state, action: PayloadAction<{ questionId: string; answerIndex: number }>) => {
      state.answers[action.payload.questionId] = action.payload.answerIndex;
      state.viewedQuestionIds[action.payload.questionId] = true;
    },
    clearAnswer: (state, action: PayloadAction<string>) => {
      delete state.answers[action.payload];
    },
    setCurrentQuestion: (state, action: PayloadAction<{ index: number; questionId: string }>) => {
      state.currentQuestionIndex = action.payload.index;
      state.viewedQuestionIds[action.payload.questionId] = true;
    },
    toggleMarkQuestion: (state, action: PayloadAction<string>) => {
      const questionId = action.payload;
      state.viewedQuestionIds[questionId] = true;
      if (state.markedQuestionIds[questionId]) {
        delete state.markedQuestionIds[questionId];
      } else {
        state.markedQuestionIds[questionId] = true;
      }
    },
    updateTime: (state) => {
      if (state.timeRemaining > 0) {
        state.timeRemaining -= 1;
      }
    },
    completeTest: (state) => {
      state.status = 'completed';
      state.timeRemaining = 0;
    },
    setError: (state) => {
      state.status = 'error';
    }
  },
});

export const {
  startTest,
  restoreTestSession,
  setAnswer,
  clearAnswer,
  setCurrentQuestion,
  toggleMarkQuestion,
  updateTime,
  completeTest,
  setError
} = testSlice.actions;
export default testSlice.reducer;
