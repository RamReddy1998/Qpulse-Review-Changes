export type Role = 'LEARNER' | 'ADMIN';

export interface User {
  id: string;
  username: string;
  role: Role;
  learningType?: 'BATCH' | 'SELF';
  createdAt?: string;
  batchParticipants?: Array<{
    batch: {
      id: string;
      batchName: string;
      certification: { name: string };
    };
  }>;
}

export interface Certification {
  id: string;
  name: string;
  description: string;
  examDate?: string | null;
  _count: { questions: number };
}

export interface QuestionOption {
  A: string;
  B: string;
  C: string;
  D: string;
}

export interface Question {
  id: string;
  questionText: string;
  options: QuestionOption;
  difficulty: string;
  topic: string;
  certificationId: string;
}

export interface QuestionWithAnswer extends Question {
  correctAnswer: string;
  userAnswer: string;
  isCorrect: boolean;
  timeSpentSec: number;
}

export interface AiExplanation {
  stepByStep: string;
  conceptual: string;
  examOriented: string;
  correctAnswerExplanation: string;
  wrongOptionsExplanation: Record<string, string>;
  examTrap: string;
  memoryTrick: string;
  sourceLinks?: { title: string; url: string }[];
}

export interface MockTestStart {
  mockTestId: string;
  mockName: string;
  questions: Question[];
  totalQuestions: number;
}

export interface MockTestResult {
  mockTestId: string;
  totalQuestions: number;
  correct: number;
  wrong: number;
  unanswered: number;
  totalScore: number;
  percentage: number;
}

export interface MockTestAttemptDetail {
  questionId: string;
  questionText: string;
  options: QuestionOption;
  correctAnswer: string;
  userAnswer: string;
  isCorrect: boolean;
  timeSpentSec: number;
  topic: string;
}

export interface MockTestResultDetail {
  id: string;
  mockName: string;
  certificationName: string;
  totalScore: number;
  startedAt: string;
  completedAt: string | null;
  attempts: MockTestAttemptDetail[];
}

export interface MockTestHistoryItem {
  id: string;
  mockName: string;
  totalScore: number;
  startedAt: string;
  completedAt: string | null;
  certification?: { name: string };
  _count?: { attempts: number };
}

export interface ReadinessScore {
  avgScore: number;
  trendGrowth: number;
  topicMastery: number;
  timeEfficiency: number;
  finalScore: number;
  status: string;
}

export interface ReadinessHistory {
  id: string;
  score: number;
  status: string;
  calculatedAt: string;
  certification?: { name: string } | null;
}

export interface TopicAccuracy {
  topic: string;
  correct: number;
  total: number;
  accuracy: number;
  avgTime: number;
}

export interface MistakeLog {
  id: string;
  mistakeCount: number;
  lastAttemptedAt: string;
  question: {
    id: string;
    questionText: string;
    options: QuestionOption;
    correctAnswer: string;
    topic: string;
    difficulty: string;
    certificationId: string;
    certification: { name: string };
  };
}

export interface AdminDashboard {
  totalLearners: number;
  activeLearners: number;
  avgReadiness: number;
  totalMocks: number;
  currentMonthBatches?: Array<{ id: string; batchName: string; certificationName: string; participantCount: number; startTime: string | null; endTime: string | null; createdAt: string }>;
  nextMonthBatches?: Array<{ id: string; batchName: string; certificationName: string; participantCount: number; startTime: string | null; endTime: string | null; createdAt: string }>;
  completedBatches?: Array<{ id: string; batchName: string; certificationName: string; participantCount: number; startTime: string | null; endTime: string | null; createdAt: string }>;
}

export interface LearnerAnalytics {
  username: string;
  learningType?: 'BATCH' | 'SELF';
  totalTimeSec: number;
  totalAttempts: number;
  mockTestCount: number;
  readinessScore: number;
  readinessStatus: string;
  readinessHistory?: Array<{ score: number; date: string }>;
  topicAccuracy: TopicAccuracy[];
  weakTopics: Array<{ topic: string; count: number; totalMistakes: number }>;
  batches?: Array<{ id: string; batchName: string; certificationName: string }>;
}

export interface Batch {
  id: string;
  batchName: string;
  certificationId: string;
  startTime?: string | null;
  endTime?: string | null;
  createdAt: string;
  certification: { name: string };
  _count?: { participants: number };
  participants?: Array<{ id: string; user: { id: string; username: string } }>;
}

export interface AiHint {
  hints: string[];
  tips: string[];
  solvingStrategy: string;
}

export interface BatchParticipantAnalytics {
  id: string;
  userId: string;
  username: string;
  certification: string;
  scoreRange: string;
  activityStatus: 'Active' | 'Inactive';
}

export interface UploadResult {
  total: number;
  successful: number;
  failed: number;
  failures: Array<{ index: number; reason: string }>;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
