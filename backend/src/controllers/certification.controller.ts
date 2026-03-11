import { Request, Response, NextFunction } from 'express';
import { CertificationService } from '../services/certification.service';
import { sendSuccess } from '../utils/response';

const certService = new CertificationService();

export class CertificationController {
  static async getAll(_req: Request, res: Response, next: NextFunction) {
    try {
      const certifications = await certService.getAll();
      sendSuccess(res, certifications, 'Certifications retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const certification = await certService.getById(req.params.id as string);
      sendSuccess(res, certification, 'Certification retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async getQuestionCounts(_req: Request, res: Response, next: NextFunction) {
    try {
      const counts = await certService.getQuestionCounts();
      sendSuccess(res, counts, 'Question counts retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async getTopics(req: Request, res: Response, next: NextFunction) {
    try {
      const topics = await certService.getTopics(req.params.id as string);
      sendSuccess(res, topics, 'Topics retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async getDifficulties(req: Request, res: Response, next: NextFunction) {
    try {
      const difficulties = await certService.getDifficulties(req.params.id as string);
      sendSuccess(res, difficulties, 'Difficulties retrieved');
    } catch (error) {
      next(error);
    }
  }
}
