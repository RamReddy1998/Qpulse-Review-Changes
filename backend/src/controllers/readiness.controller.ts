import { Response, NextFunction } from 'express';
import { ReadinessService } from '../services/readiness.service';
import { ActivityRepository } from '../repositories/activity.repository';
import { MistakeRepository } from '../repositories/mistake.repository';
import { AuthenticatedRequest } from '../types';
import { sendSuccess, sendPaginated } from '../utils/response';

const readinessService = new ReadinessService();
const activityRepo = new ActivityRepository();
const mistakeRepo = new MistakeRepository();

export class ReadinessController {
  static async calculate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const certificationId = req.query.certificationId as string | undefined;
      const score = await readinessService.calculateReadiness(userId, certificationId);
      sendSuccess(res, score, 'Readiness score calculated');
    } catch (error) {
      next(error);
    }
  }

  static async getLatest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const certificationId = req.query.certificationId as string | undefined;
      const score = await readinessService.getLatest(userId, certificationId);
      sendSuccess(res, score, 'Latest readiness score retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async getHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const certificationId = req.query.certificationId as string | undefined;
      const history = await readinessService.getHistory(userId, certificationId);
      sendSuccess(res, history, 'Readiness history retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async getTopicAccuracy(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const certificationId = req.query.certificationId as string | undefined;
      const accuracy = await activityRepo.getTopicAccuracy(userId, certificationId);
      sendSuccess(res, accuracy, 'Topic accuracy retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async getMistakes(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const { mistakes, total } = await mistakeRepo.findByUser(userId, page, limit);
      sendPaginated(res, mistakes, total, page, limit, 'Mistakes retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async getActivityLogs(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const { logs, total } = await activityRepo.getByUser(userId, page, limit);
      sendPaginated(res, logs, total, page, limit, 'Activity logs retrieved');
    } catch (error) {
      next(error);
    }
  }
}
