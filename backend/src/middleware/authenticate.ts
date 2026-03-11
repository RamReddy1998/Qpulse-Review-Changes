import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { verifyAccessToken } from '../utils/jwt';
import { UnauthorizedError } from '../utils/errors';
import logger from '../config/logger';

export function authenticate(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  try {
    const token = req.cookies?.accessToken;

    if (!token) {
      throw new UnauthorizedError('Access token not found');
    }

    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error) {
    logger.warn('Authentication failed', { 
      path: req.path,
      ip: req.ip,
    });
    next(new UnauthorizedError('Invalid or expired access token'));
  }
}
