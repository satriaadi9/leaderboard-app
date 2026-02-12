import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '@/utils/auth';
import { AppError } from '@/utils/errors';
import { UserRole } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  user: TokenPayload;
}

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError('No token provided', 401));
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    next(new AppError('Invalid token', 401));
  }
};

export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== (UserRole as any).SUPERADMIN) {
    return next(new AppError('Access denied. Superadmin only.', 403));
  }
  next();
};

export const authorize = (roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('Forbidden', 403));
    }
    next();
  };
};
