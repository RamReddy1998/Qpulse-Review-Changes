import { Role } from '@prisma/client';
import { Request } from 'express';

export interface JwtPayload {
  userId: string;
  username: string;
  role: Role;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export interface QuestionOption {
  A: string;
  B: string;
  C: string;
  D: string;
}

export interface AiExplanationResponse {
  stepByStep: string;
  conceptual: string;
  examOriented: string;
  correctAnswerExplanation: string;
  wrongOptionsExplanation: Record<string, string>;
  examTrap: string;
  memoryTrick: string;
  sourceLinks?: { title: string; url: string }[];
}

export interface ReadinessScoreData {
  avgScore: number;
  trendGrowth: number;
  topicMastery: number;
  timeEfficiency: number;
  finalScore: number;
  status: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface SeedQuestion {
  'Sno.': number;
  Question: string;
  Option_A: string;
  Option_B: string;
  Option_C: string;
  Option_D: string;
  Answers: string;
  Topics: string;
  certification_name: string;
}
