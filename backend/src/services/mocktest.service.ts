import { MockTestRepository } from '../repositories/mocktest.repository';
import { QuestionRepository } from '../repositories/question.repository';
import { ActivityRepository } from '../repositories/activity.repository';
import { MistakeRepository } from '../repositories/mistake.repository';
import { NotFoundError, BadRequestError } from '../utils/errors';
import logger from '../config/logger';

export class MockTestService {
  private mockTestRepo: MockTestRepository;
  private questionRepo: QuestionRepository;
  private activityRepo: ActivityRepository;
  private mistakeRepo: MistakeRepository;

  constructor() {
    this.mockTestRepo = new MockTestRepository();
    this.questionRepo = new QuestionRepository();
    this.activityRepo = new ActivityRepository();
    this.mistakeRepo = new MistakeRepository();
  }

  async startMockTest(userId: string, certificationId: string, questionCount: number, topics?: string[], difficulties?: string[], mockName?: string) {
    // Get random questions based on filters
    const questions = await this.questionRepo.findRandomByCertification(certificationId, questionCount, topics, difficulties);

    if (questions.length === 0) {
      throw new NotFoundError('No questions found for this certification');
    }

    const name = mockName || `Mock Test - ${new Date().toISOString().split('T')[0]} - ${Date.now().toString(36)}`;

    const mockTest = await this.mockTestRepo.create(userId, name, certificationId);

    logger.info('Mock test started', { mockTestId: mockTest.id, userId, questionCount: questions.length });

    return {
      mockTestId: mockTest.id,
      mockName: name,
      questions: questions.map((q) => ({
        id: q.id,
        questionText: q.questionText,
        options: q.options,
        difficulty: q.difficulty,
        topic: q.topic,
      })),
      totalQuestions: questions.length,
    };
  }

  async submitMockTest(
    userId: string,
    mockTestId: string,
    answers: Array<{ questionId: string; userAnswer: string; timeSpentSec: number }>
  ) {
    const mockTest = await this.mockTestRepo.findById(mockTestId);
    if (!mockTest) {
      throw new NotFoundError('Mock test not found');
    }

    if (mockTest.userId !== userId) {
      throw new BadRequestError('This mock test does not belong to you');
    }

    if (mockTest.completedAt) {
      throw new BadRequestError('This mock test has already been submitted');
    }

    // Process answers
    let correctCount = 0;
    let wrongCount = 0;
    const attempts: Array<{
      questionId: string;
      userAnswer: string;
      isCorrect: boolean;
      timeSpentSec: number;
    }> = [];

    for (const answer of answers) {
      const question = await this.questionRepo.findById(answer.questionId);
      if (!question) continue;

      const isCorrect = answer.userAnswer.toUpperCase() === question.correctAnswer.toUpperCase();

      if (answer.userAnswer) {
        if (isCorrect) {
          correctCount++;
        } else {
          wrongCount++;
          // Log mistake
          await this.mistakeRepo.upsert(userId, answer.questionId);
        }

        // Log activity
        await this.activityRepo.create(userId, answer.questionId, answer.timeSpentSec, isCorrect, question.topic);
      }

      attempts.push({
        questionId: answer.questionId,
        userAnswer: answer.userAnswer || '',
        isCorrect,
        timeSpentSec: answer.timeSpentSec,
      });
    }

    // Save attempts
    await this.mockTestRepo.createAttempts(mockTestId, attempts);

    // Calculate score (simple tally of correct answers)
    const finalScore = correctCount;

    // Complete mock test
    await this.mockTestRepo.complete(mockTestId, finalScore);

    const totalQuestions = answers.length;
    const unanswered = totalQuestions - correctCount - wrongCount;

    logger.info('Mock test completed', {
      mockTestId,
      correctCount,
      wrongCount,
      unanswered,
      finalScore,
    });

    return {
      mockTestId,
      totalQuestions,
      correct: correctCount,
      wrong: wrongCount,
      unanswered,
      totalScore: finalScore,
      percentage: totalQuestions > 0 ? Math.round((finalScore / totalQuestions) * 100) : 0,
    };
  }

  async getMockTestResult(mockTestId: string, userId: string) {
    const mockTest = await this.mockTestRepo.findById(mockTestId);
    if (!mockTest) {
      throw new NotFoundError('Mock test not found');
    }

    if (mockTest.userId !== userId) {
      throw new BadRequestError('This mock test does not belong to you');
    }

    return {
      id: mockTest.id,
      mockName: mockTest.mockName,
      certificationName: mockTest.certification.name,
      totalScore: mockTest.totalScore,
      startedAt: mockTest.startedAt,
      completedAt: mockTest.completedAt,
      attempts: mockTest.attempts.map((a) => ({
        questionId: a.questionId,
        questionText: a.question.questionText,
        options: a.question.options,
        correctAnswer: a.question.correctAnswer,
        userAnswer: a.userAnswer,
        isCorrect: a.isCorrect,
        timeSpentSec: a.timeSpentSec,
        topic: a.question.topic,
      })),
    };
  }

  async getUserMockTests(userId: string, page: number, limit: number) {
    return this.mockTestRepo.findByUser(userId, page, limit);
  }
}
