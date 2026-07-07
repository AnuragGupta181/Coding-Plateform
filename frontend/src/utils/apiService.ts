import axios from 'axios';

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const API_BASE_URL = trimTrailingSlash(
  import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api')
);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token is expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Redirect to login if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const testService = {
  signup: (name: string, email: string, password: string) => api.post('/auth/signup', { name, email, password }),
  verifyOTP: (email: string, otp: string) => api.post('/auth/verify', { email, otp }),
  resendOTP: (email: string) => api.post('/auth/resend-otp', { email }),
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (email: string, otp: string, password: string) =>
    api.post('/auth/reset-password', { email, otp, password }),

  getAvailableTests: () => api.get('/tests/available'),
  getTest: (id: string) => api.get(`/test/${id}`),

  startSubmission: (candidateEmail: string, candidateName: string, testId: string) =>
    api.post('/submission/start', { candidateEmail, candidateName, testId }),

  saveAnswer: (submissionId: string, questionId: string, answerIndex: number) =>
    api.post(`/submission/${submissionId}/save-answer`, { questionId, answerIndex }),

  clearAnswer: (submissionId: string, questionId: string) =>
    api.post(`/submission/${submissionId}/clear-answer`, { questionId }),

  completeSubmission: (submissionId: string) =>
    api.post(`/submission/${submissionId}/complete`),

  logViolation: (submissionId: string, violation: { type: string; timestamp: number; count: number }) =>
    api.post(`/submission/${submissionId}/log-violation`, violation),

  createTest: (testData: unknown) => api.post('/admin/test', testData),
  openWaitingRoom: (testId: string) => api.post(`/admin/test/${testId}/open-waiting-room`),
  startTest: (testId: string) => api.post(`/admin/test/${testId}/start`),
  completeTest: (testId: string) => api.post(`/admin/test/${testId}/complete`),
  autoSubmitTest: (testId: string) => api.post(`/admin/test/${testId}/auto-submit`),

  getTestHistory: () => api.get('/admin/tests/history'),
  getWaitingQueues: () => api.get('/admin/tests/queues'),
  getTestResults: (testId: string) => api.get(`/admin/test/${testId}/results`),
  getSubmissionDetails: (subId: string) => api.get(`/admin/submission/${subId}`),
  createCodingQuestion: (testId: string, data: unknown) => api.post(`/admin/test/${testId}/coding-question`, data),

  // Code execution
  runCode: (sourceCode: string, language: string, stdin?: string) =>
    api.post('/code/run', { sourceCode, language, stdin }),
  submitCode: (testId: string, questionId: string, sourceCode: string, language: string, submissionId: string) =>
    api.post(`/code/submit/${testId}/${questionId}`, { sourceCode, language, submissionId }),
  analyzeCode: (sourceCode: string, language: string, title: string, submissionId?: string, questionId?: string, description?: string, testCases?: any[]) =>
    api.post('/code/analyze', { sourceCode, language, title, submissionId, questionId, description, testCases }),
  chatWithCode: (sourceCode: string, language: string, title: string, messages: {role: string, content: string}[]) =>
    api.post('/code/chat', { sourceCode, language, title, messages }),
};

export const createEventSourceUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
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
