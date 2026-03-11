import { QuestionRepository } from '../repositories/question.repository';
import { ActivityRepository } from '../repositories/activity.repository';
import { MistakeRepository } from '../repositories/mistake.repository';
import { AiCacheRepository } from '../repositories/aiCache.repository';
import { getAiProvider } from './ai/ai.factory';
import { NotFoundError } from '../utils/errors';
import { QuestionOption } from '../types';
import logger from '../config/logger';

export class PracticeService {
  private questionRepo: QuestionRepository;
  private activityRepo: ActivityRepository;
  private mistakeRepo: MistakeRepository;
  private aiCacheRepo: AiCacheRepository;

  constructor() {
    this.questionRepo = new QuestionRepository();
    this.activityRepo = new ActivityRepository();
    this.mistakeRepo = new MistakeRepository();
    this.aiCacheRepo = new AiCacheRepository();
  }

  async getRandomQuestions(certificationId: string, count: number = 1, excludeIds: string[] = []) {
    const questions = await this.questionRepo.findRandomForPractice(certificationId, excludeIds, count);
    // Return questions without correct answer exposed
    return questions.map((q) => ({
      id: q.id,
      questionText: q.questionText,
      options: q.options,
      difficulty: q.difficulty,
      topic: q.topic,
      certificationId: q.certificationId,
    }));
  }

  async getFilteredQuestions(
    certificationId: string,
    filters: { topic?: string; difficulty?: string; limit?: number }
  ) {
    const questions = await this.questionRepo.findFiltered(certificationId, filters);
    return questions.map((q) => ({
      id: q.id,
      questionText: q.questionText,
      options: q.options,
      difficulty: q.difficulty,
      topic: q.topic,
      certificationId: q.certificationId,
    }));
  }

  async getFilterCount(
    certificationId: string,
    filters: { topic?: string | string[]; difficulty?: string | string[] }
  ) {
    return this.questionRepo.countFiltered(certificationId, filters);
  }

  async submitAnswer(userId: string, questionId: string, userAnswer: string, timeSpentSec: number) {
    const question = await this.questionRepo.findById(questionId);
    if (!question) {
      throw new NotFoundError('Question not found');
    }

    const isCorrect = userAnswer.toUpperCase() === question.correctAnswer.toUpperCase();

    // Log activity
    await this.activityRepo.create(userId, questionId, timeSpentSec, isCorrect, question.topic);

    // Log mistake if incorrect
    if (!isCorrect) {
      await this.mistakeRepo.upsert(userId, questionId);
    }

    return {
      isCorrect,
      correctAnswer: question.correctAnswer,
      userAnswer,
    };
  }

  async getExplanation(questionId: string, userAnswer?: string) {
    const question = await this.questionRepo.findById(questionId);
    if (!question) {
      throw new NotFoundError('Question not found');
    }

    // Check cache first
    const cacheKey = userAnswer ? `explanation_${userAnswer}` : 'explanation';
    const cached = await this.aiCacheRepo.findByQuestionAndType(questionId, cacheKey);
    if (cached) {
      logger.debug('Returning cached AI explanation', { questionId });
      return cached.response;
    }

    // Call AI provider
    const aiProvider = getAiProvider();
    const options = question.options as unknown as QuestionOption;

    try {
      const explanation = await aiProvider.generateExplanation(
        question.questionText,
        options as unknown as Record<string, string>,
        question.correctAnswer,
        userAnswer
      );

      // Cache the response
      await this.aiCacheRepo.save(questionId, cacheKey, explanation);

      return explanation;
    } catch (error) {
      logger.error('AI explanation failed', {
        questionId,
        error: error instanceof Error ? error.message : 'Unknown',
      });
      throw error;
    }
  }

  async getHint(questionId: string) {
    const question = await this.questionRepo.findById(questionId);
    if (!question) {
      throw new NotFoundError('Question not found');
    }

    const toList = (text: string): string[] => {
      const parts = text
        .split(/\r?\n|•|\u2022/) // split on newlines/bullets
        .map((p) => p.replace(/^\s*[-*]\s*/, '').trim())
        .filter(Boolean);

      return parts.length > 0 ? parts : [text.trim()];
    };

    // Check cache first
    const cacheKey = 'hint';
    const cached = await this.aiCacheRepo.findByQuestionAndType(questionId, cacheKey);
    if (cached) {
      logger.debug('Returning cached AI hint', { questionId });

      const resp = cached.response as unknown as Record<string, unknown>;
      const hints = resp.hints;
      const tips = resp.tips;

      // Support legacy cached structure: { hints: string, tips: string, strategy: string }
      const normalized = {
        hints: Array.isArray(hints)
          ? (hints as string[])
          : typeof hints === 'string'
            ? toList(hints)
            : toList('Think about the core concept behind this question.'),
        tips: Array.isArray(tips)
          ? (tips as string[])
          : typeof tips === 'string'
            ? toList(tips)
            : toList('Focus on what the question is really asking.'),
        solvingStrategy: String(resp.solvingStrategy || resp.strategy || 'Eliminate obviously wrong options first.').trim(),
      };

      return normalized;
    }

    // Generate hint (without revealing the answer)
    const aiProvider = getAiProvider();
    const options = question.options as unknown as QuestionOption;

    try {
      const hintResponse = await aiProvider.generateHint(
        question.questionText,
        options as unknown as Record<string, string>,
        question.correctAnswer
      );

      await this.aiCacheRepo.save(questionId, cacheKey, hintResponse);

      return hintResponse;
    } catch (error) {
      logger.error('AI hint generation failed', {
        questionId,
        error: error instanceof Error ? error.message : 'Unknown',
      });
      throw error;
    }
  }

  async getQuestionById(questionId: string) {
    const question = await this.questionRepo.findById(questionId);
    if (!question) {
      throw new NotFoundError('Question not found');
    }

    return {
      id: question.id,
      questionText: question.questionText,
      options: question.options,
      difficulty: question.difficulty,
      topic: question.topic,
      certificationId: question.certificationId,
    };
  }

  async getTopics(certificationId: string) {
    return this.questionRepo.getTopicsByCertification(certificationId);
  }

  async getDifficulties(certificationId: string) {
    return this.questionRepo.getDifficultiesByCertification(certificationId);
  }

  async getQuestionByOffset(certificationId: string, offset: number, filters?: { topic?: string, difficulty?: string }) {
    const question = await this.questionRepo.findByOffset(certificationId, offset, filters);
    if (!question) {
      throw new NotFoundError('Question not found');
    }
    return {
      id: question.id,
      questionText: question.questionText,
      options: question.options,
      difficulty: question.difficulty,
      topic: question.topic,
      certificationId: question.certificationId,
    };
  }

  async getTotalQuestionCount(certificationId: string) {
    return this.questionRepo.countByCertification(certificationId);
  }
}
