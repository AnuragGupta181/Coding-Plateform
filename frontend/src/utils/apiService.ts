import axios from 'axios';

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const DEFAULT_BASE = trimTrailingSlash(
  import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api')
);

// ── CQRS Base URLs ────────────────────────────────────────────────────────────
// In a split-host CQRS deployment you can set:
//   VITE_QUERY_BASE_URL   → points to the query (read) service
//   VITE_COMMAND_BASE_URL → points to the command (write) service
// Both fall back to VITE_API_BASE_URL when not set (monolith / "both" mode).
const QUERY_BASE_URL = trimTrailingSlash(
  import.meta.env.VITE_QUERY_BASE_URL || DEFAULT_BASE
);
const COMMAND_BASE_URL = trimTrailingSlash(
  import.meta.env.VITE_COMMAND_BASE_URL || DEFAULT_BASE
);
const AUTH_BASE_URL = DEFAULT_BASE;

const authInterceptor = (instance: ReturnType<typeof axios.create>) => {
  instance.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response && error.response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
      return Promise.reject(error);
    }
  );

  return instance;
};

// Three axios instances: one per service boundary
const authApi = authInterceptor(
  axios.create({ baseURL: AUTH_BASE_URL, headers: { 'Content-Type': 'application/json' } })
);
const queryApi = authInterceptor(
  axios.create({ baseURL: `${QUERY_BASE_URL}/query`, headers: { 'Content-Type': 'application/json' } })
);
const commandApi = authInterceptor(
  axios.create({ baseURL: `${COMMAND_BASE_URL}/command`, headers: { 'Content-Type': 'application/json' } })
);

export const testService = {
  // ── Auth (unchanged — always /api/auth/...) ─────────────────────────────────
  signup: (name: string, email: string, password: string, mobileNumber?: string, turnstileToken?: string) =>
    authApi.post('/auth/signup', { name, email, password, mobileNumber, turnstileToken }),
  verifyOTP: (email: string, otp: string) =>
    authApi.post('/auth/verify', { email, otp }),
  resendOTP: (email: string) =>
    authApi.post('/auth/resend-otp', { email }),
  login: (email: string, password: string, turnstileToken?: string) =>
    authApi.post('/auth/login', { email, password, turnstileToken }),
  forgotPassword: (email: string) =>
    authApi.post('/auth/forgot-password', { email }),
  resetPassword: (email: string, otp: string, password: string) =>
    authApi.post('/auth/reset-password', { email, otp, password }),

  // ── Query Routes (GET /api/query/...) ───────────────────────────────────────
  getAvailableTests: () =>
    queryApi.get('/tests/available'),
  getTest: (id: string) =>
    queryApi.get(`/test/${id}`),
  getStudentSubmissions: (email: string) =>
    queryApi.get(`/submissions/me?email=${encodeURIComponent(email)}&_t=${Date.now()}`),

  getTestHistory: () =>
    queryApi.get('/admin/tests/history'),
  getWaitingQueues: () =>
    queryApi.get('/admin/tests/queues'),
  getTestResults: (testId: string) =>
    queryApi.get(`/admin/test/${testId}/results`),
  getActiveTestUsers: (testId: string) =>
    queryApi.get(`/admin/test/${testId}/active-users`),
  getSubmissionDetails: (subId: string) =>
    queryApi.get(`/admin/submission/${subId}`),

  // ── Command Routes (POST /api/command/...) ──────────────────────────────────
  startSubmission: (candidateEmail: string, candidateName: string, testId: string) =>
    commandApi.post('/submission/start', { candidateEmail, candidateName, testId }),
  saveAnswer: (submissionId: string, questionId: string, answerIndex: number) =>
    commandApi.post(`/submission/${submissionId}/save-answer`, { questionId, answerIndex }),
  clearAnswer: (submissionId: string, questionId: string) =>
    commandApi.post(`/submission/${submissionId}/clear-answer`, { questionId }),
  completeSubmission: (submissionId: string) =>
    commandApi.post(`/submission/${submissionId}/complete`),
  logViolation: (submissionId: string, violation: { type: string; timestamp: number; count: number }) =>
    commandApi.post(`/submission/${submissionId}/log-violation`, violation),
  reportProblem: (submissionId: string, description: string, questionId?: string) =>
    commandApi.post(`/submission/${submissionId}/report-problem`, { description, questionId }),
  submitFeedback: (submissionId: string, rating: number, comment: string) =>
    commandApi.post(`/submission/${submissionId}/feedback`, { rating, comment }),

  createTest: (testData: unknown) =>
    commandApi.post('/admin/test', testData),
  openWaitingRoom: (testId: string) =>
    commandApi.post(`/admin/test/${testId}/open-waiting-room`),
  startTest: (testId: string) =>
    commandApi.post(`/admin/test/${testId}/start`),
  completeTest: (testId: string) =>
    commandApi.post(`/admin/test/${testId}/complete`),
  autoSubmitTest: (testId: string) =>
    commandApi.post(`/admin/test/${testId}/auto-submit`),
  createCodingQuestion: (testId: string, data: unknown) =>
    commandApi.post(`/admin/test/${testId}/coding-question`, data),

  // ── Admin Dashboard & AI Routes ─────────────────────────────────────────────
  getTestDashboardData: (testId: string) =>
    queryApi.get(`/admin/test/${testId}/dashboard`),
  analyzeOverallExperience: (testId: string) =>
    commandApi.post(`/admin/test/${testId}/analyze-overall`),
  analyzeReportedIssue: (submissionId: string, issueId: string) =>
    commandApi.post(`/admin/issue/${submissionId}/${issueId}/analyze`),

  sendProctorMessage: (testId: string, candidateEmail: string, message: string) =>
    commandApi.post(`/admin/test/${testId}/message`, { candidateEmail, message }),
  forceSubmitCandidate: (submissionId: string) =>
    commandApi.post(`/admin/submission/${submissionId}/force-submit`),
  clearQueues: () =>
    commandApi.post('/admin/queues/clear'),
  clearTestCache: () =>
    commandApi.post('/admin/cache/clear'),

  // Code execution
  runCode: (sourceCode: string, language: string, stdin?: string, testId?: string, questionId?: string, userEmail?: string) =>
    commandApi.post('/code/run', { sourceCode, language, stdin, testId, questionId, userEmail }),
  submitCode: (testId: string, questionId: string, sourceCode: string, language: string, submissionId: string, userEmail?: string) =>
    commandApi.post(`/code/submit/${testId}/${questionId}`, { sourceCode, language, submissionId, userEmail }),
  analyzeCode: (sourceCode: string, language: string, title: string, submissionId?: string, questionId?: string, description?: string, testCases?: any[]) =>
    commandApi.post('/code/analyze', { sourceCode, language, title, submissionId, questionId, description, testCases }),
  chatWithCode: (sourceCode: string, language: string, title: string, messages: { role: string; content: string }[]) =>
    commandApi.post('/code/chat', { sourceCode, language, title, messages }),
};

export const createEventSourceUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const token = localStorage.getItem('token');
  const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
  return `${QUERY_BASE_URL}/query${normalizedPath}${tokenParam}`;
};

export const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || error.message || fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};

export default testService;
