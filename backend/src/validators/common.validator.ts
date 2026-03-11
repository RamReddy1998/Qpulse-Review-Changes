import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const uuidSchema = z.string().uuid('Invalid ID format');

export const createBatchSchema = z.object({
  batchName: z.string().min(1, 'Batch name is required').max(100),
  certificationId: z.string().uuid('Invalid certification ID'),
});

export const addParticipantSchema = z.object({
  username: z.string().min(1, 'Username is required'),
});

export const submitAnswerSchema = z.object({
  questionId: z.string().uuid('Invalid question ID'),
  userAnswer: z.string().min(1).max(1),
  timeSpentSec: z.number().int().min(0).default(0),
});

export const startMockTestSchema = z.object({
  certificationId: z.string().uuid('Invalid certification ID'),
  questionCount: z.number().int().min(5).max(100).default(30),
});

export const submitMockTestSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().uuid(),
      userAnswer: z.string().max(1),
      timeSpentSec: z.number().int().min(0).default(0),
    })
  ),
});

export const getExplanationSchema = z.object({
  questionId: z.string().uuid('Invalid question ID'),
  userAnswer: z.string().optional(),
});
