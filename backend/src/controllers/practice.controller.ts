import { Response, NextFunction } from 'express';
import { PracticeService } from '../services/practice.service';
import { AuthenticatedRequest } from '../types';
import { sendSuccess } from '../utils/response';

const practiceService = new PracticeService();

export class PracticeController {
  static async getQuestions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const certificationId = req.params.certificationId as string;
      const count = parseInt(req.query.count as string) || 1;
      const excludeIds = req.query.excludeIds
        ? (req.query.excludeIds as string).split(',')
        : [];

      const questions = await practiceService.getRandomQuestions(certificationId, count, excludeIds);
      sendSuccess(res, questions, 'Practice questions retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async getFilteredQuestions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const certificationId = req.params.certificationId as string;
      const topic = req.query.topic as string | undefined;
      const difficulty = req.query.difficulty as string | undefined;
      const limit = parseInt(req.query.limit as string) || 50;

      const questions = await practiceService.getFilteredQuestions(certificationId, {
        topic,
        difficulty,
        limit,
      });
      sendSuccess(res, questions, 'Filtered questions retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async getFilterCount(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const certificationId = req.params.certificationId as string;
      const topic = req.query.topic as string | string[] | undefined;
      const difficulty = req.query.difficulty as string | string[] | undefined;

      const count = await practiceService.getFilterCount(certificationId, { topic, difficulty });
      sendSuccess(res, count, 'Filter count retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async submitAnswer(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { questionId, userAnswer, timeSpentSec } = req.body;

      const result = await practiceService.submitAnswer(userId, questionId, userAnswer, timeSpentSec || 0);
      sendSuccess(res, result, 'Answer submitted');
    } catch (error) {
      next(error);
    }
  }

  static async getExplanation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const questionId = req.params.questionId as string;
      const userAnswer = req.query.userAnswer as string | undefined;

      const explanation = await practiceService.getExplanation(questionId, userAnswer);
      sendSuccess(res, explanation, 'Explanation retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async getHint(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const questionId = req.params.questionId as string;
      const hint = await practiceService.getHint(questionId);
      sendSuccess(res, hint, 'Hint retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async getQuestionById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const questionId = req.params.questionId as string;
      const question = await practiceService.getQuestionById(questionId);
      sendSuccess(res, question, 'Question retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async getTopics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const certificationId = req.params.certificationId as string;
      const topics = await practiceService.getTopics(certificationId);
      sendSuccess(res, topics, 'Topics retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async getDifficulties(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const certificationId = req.params.certificationId as string;
      const difficulties = await practiceService.getDifficulties(certificationId);
      sendSuccess(res, difficulties, 'Difficulties retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async getQuestionByOffset(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const certificationId = req.params.certificationId as string;
      const offset = parseInt(req.query.offset as string) || 0;
      const topic = req.query.topic as string;
      const difficulty = req.query.difficulty as string;
      
      const question = await practiceService.getQuestionByOffset(certificationId, offset, { topic, difficulty });
      sendSuccess(res, question, 'Question retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async getTotalCount(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const certificationId = req.params.certificationId as string;
      const count = await practiceService.getTotalQuestionCount(certificationId);
      sendSuccess(res, count, 'Total count retrieved');
    } catch (error) {
      next(error);
    }
  }
}
