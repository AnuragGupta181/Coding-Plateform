export interface Question {
  _id: string;
  questionText: string;
  options: string[];
  points: number;
  correctOptionIndex?: number;
}

export interface Test {
  _id: string;
  title: string;
  description: string;
  durationInMinutes: number;
  status: 'scheduled' | 'waiting' | 'active' | 'completed';
  testType: 'mcq' | 'coding' | 'mixed';
  startedAt?: string | null;
  completedAt?: string | null;
  questions: Question[];
  codingQuestions?: any[];
  proctoringConfig?: {
    cameraEnabled?: boolean;
    autoRemoveEnabled?: boolean;
    maxViolations?: number;
  };
}

export interface Submission {
  _id: string;
  candidateEmail: string;
  testId: string;
  answers: Record<string, number>;
  status: 'active' | 'completed';
}
