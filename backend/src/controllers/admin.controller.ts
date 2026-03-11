import { Response, NextFunction } from 'express';
import { AdminService } from '../services/admin.service';
import { AuthenticatedRequest } from '../types';
import { sendSuccess, sendPaginated } from '../utils/response';
import { BadRequestError } from '../utils/errors';

const adminService = new AdminService();

export class AdminController {
  static async getDashboard(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const dashboard = await adminService.getDashboard();
      sendSuccess(res, dashboard, 'Admin dashboard retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async getLearners(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const { users, total } = await adminService.getLearners(page, limit);
      sendPaginated(res, users, total, page, limit, 'Learners retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async getLearnerAnalytics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.params.userId as string;
      const analytics = await adminService.getLearnerAnalytics(userId);
      sendSuccess(res, analytics, 'Learner analytics retrieved');
    } catch (error) {
      next(error);
    }
  }

  // Batch management
  static async createBatch(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { batchName, certificationId, startTime, endTime } = req.body;
      const batch = await adminService.createBatch(batchName, certificationId, startTime, endTime);
      sendSuccess(res, batch, 'Batch created', 201);
    } catch (error) {
      next(error);
    }
  }

  static async getBatches(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const { batches, total } = await adminService.getBatches(page, limit);
      sendPaginated(res, batches, total, page, limit, 'Batches retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async updateBatch(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const batchId = req.params.batchId as string;
      const data = req.body;
      const updatedBatch = await adminService.updateBatch(batchId, data);
      sendSuccess(res, updatedBatch, 'Batch updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deleteBatch(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const batchId = req.params.batchId as string;
      await adminService.deleteBatch(batchId);
      sendSuccess(res, { success: true }, 'Batch deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getBatchDetails(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const batchId = req.params.batchId as string;
      const batch = await adminService.getBatchDetails(batchId);
      sendSuccess(res, batch, 'Batch details retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async addParticipant(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const batchId = req.params.batchId as string;
      const { username } = req.body;
      const result = await adminService.addParticipant(batchId, username);
      sendSuccess(res, result, 'Participant added');
    } catch (error) {
      next(error);
    }
  }

  static async removeParticipant(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const batchId = req.params.batchId as string;
      const userId = req.params.userId as string;
      const result = await adminService.removeParticipant(batchId, userId);
      sendSuccess(res, result, 'Participant removed');
    } catch (error) {
      next(error);
    }
  }

  static async getBatchParticipantsAnalytics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const batchId = req.params.batchId as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await adminService.getBatchParticipantsWithAnalytics(batchId, page, limit);
      sendSuccess(res, result, 'Batch participants analytics retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async getWeaknessQuestions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const topic = req.query.topic as string;
      const certificationId = req.query.certificationId as string | undefined;
      const questions = await adminService.getWeaknessQuestions(topic, certificationId);
      sendSuccess(res, questions, 'Weakness questions retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async uploadQuestionsNewCertification(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { certificationName, questions } = req.body;
      const result = await adminService.createCertificationAndUploadQuestions(certificationName, questions);
      sendSuccess(res, result, 'Questions uploaded to new certification');
    } catch (error) {
      next(error);
    }
  }

  static async uploadQuestions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const certificationId = req.params.certificationId as string;
      const { questions } = req.body;
      const result = await adminService.uploadQuestions(certificationId, questions);
      sendSuccess(res, result, 'Questions uploaded');
    } catch (error) {
      next(error);
    }
  }

  static async aiExtractQuestions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw new BadRequestError('No file uploaded');
      }
      const questions = await adminService.aiExtractQuestions(req.file);
      sendSuccess(res, questions, 'Questions extracted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getQuestionsByCertification(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const certificationId = req.params.certificationId as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const { questions, total } = await adminService.getQuestionsByCertification(certificationId, page, limit);
      sendPaginated(res, questions, total, page, limit, 'Certification questions retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async updateQuestion(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const questionId = req.params.questionId as string;
      const data = req.body;
      const updatedQuestion = await adminService.updateQuestion(questionId, data);
      sendSuccess(res, updatedQuestion, 'Question updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deleteQuestion(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const questionId = req.params.questionId as string;
      await adminService.deleteQuestion(questionId);
      sendSuccess(res, { success: true }, 'Question deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deleteCertification(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const certificationId = req.params.certificationId as string;
      await adminService.deleteCertification(certificationId);
      sendSuccess(res, { success: true }, 'Certification deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}
