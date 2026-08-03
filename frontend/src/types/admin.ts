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
  description?: string;
  status: string;
  durationInMinutes?: number;
  proctoringConfig?: {
    cameraEnabled?: boolean;
    autoRemoveEnabled?: boolean;
    maxViolations?: number;
  };
  startedAt?: string;
  scheduledFor?: string;
  activeSubmissionCount: number;
  completedSubmissionCount: number;
  waitingUsers: WaitingUser[];
}

export interface Violation {
  type: string;
  timestamp: string;
  count: number;
}

export interface ActiveUser {
  id: string;
  name: string;
  email: string;
  startTime: string;
  violations: Violation[];
  answeredCount: number;
}

export type AdminSection = 'overview' | 'monitoring' | 'system' | 'queues' | 'history' | 'create' | 'aichat';
