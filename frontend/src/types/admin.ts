export interface TestSummary {
  _id: string;
  title: string;
  status: 'scheduled' | 'waiting' | 'active' | 'completed';
  createdAt?: string;
}

export interface WaitingUser {
  id: string | number;
  name: string;
  email: string;  
}

export interface QueueSummary {
  testId: string;
  title: string;
  status: string;
  durationInMinutes?: number;
  startedAt?: string;
  activeSubmissionCount: number;
  completedSubmissionCount: number;
  waitingUsers: WaitingUser[];
}

export type AdminSection = 'overview' | 'queue' | 'history' | 'create' | 'aichat';
