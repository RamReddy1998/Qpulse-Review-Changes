import { Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { AuthenticatedRequest } from '../types';
import { ForbiddenError } from '../utils/errors';

export function authorize(...roles: Role[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new ForbiddenError('User not authenticated'));
      return;
    }

    if (!roles.includes(req.user.role as Role)) {
      next(new ForbiddenError(`Role '${req.user.role}' is not authorized for this resource`));
      return;
    }

    next();
  };
}
