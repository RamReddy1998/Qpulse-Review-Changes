import { Response, NextFunction } from 'express';
import { MockTestService } from '../services/mocktest.service';
import { AuthenticatedRequest } from '../types';
import { sendSuccess, sendPaginated } from '../utils/response';

const mockTestService = new MockTestService();

export class MockTestController {
  static async start(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { certificationId, questionCount, topics, difficulties, mockName } = req.body;

      const result = await mockTestService.startMockTest(
        userId, 
        certificationId, 
        questionCount || 30, 
        topics, 
        difficulties, 
        mockName
      );
      sendSuccess(res, result, 'Mock test started', 201);
    } catch (error) {
      next(error);
    }
  }

  static async submit(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const mockTestId = req.params.mockTestId as string;
      const { answers } = req.body;

      const result = await mockTestService.submitMockTest(userId, mockTestId, answers);
      sendSuccess(res, result, 'Mock test submitted');
    } catch (error) {
      next(error);
    }
  }

  static async getResult(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const mockTestId = req.params.mockTestId as string;

      const result = await mockTestService.getMockTestResult(mockTestId, userId);
      sendSuccess(res, result, 'Mock test result retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async getUserTests(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const { tests, total } = await mockTestService.getUserMockTests(userId, page, limit);
      sendPaginated(res, tests, total, page, limit, 'Mock tests retrieved');
    } catch (error) {
      next(error);
    }
  }
}
