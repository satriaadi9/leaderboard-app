import { Request, Response, NextFunction } from 'express';
import { pointsService } from '@/services/points.service';
import { AuthenticatedRequest } from '@/middleware/auth';
import { classService } from '@/services/class.service';
import { AppError } from '@/utils/errors';

export const adjustPoints = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studentId, delta, reason } = req.body;
    const { id: classId } = req.params;
    const { userId, role } = (req as AuthenticatedRequest).user;

    const hasAccess = await classService.verifyClassAccess(classId, userId, role);
    if (!hasAccess) throw new AppError('Forbidden: You do not have access to this class', 403);

    const data = await pointsService.adjustPoints(classId, studentId, delta, userId, reason);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const adjustPointsBulk = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studentIds, delta, reason } = req.body;
    const { id: classId } = req.params;
    const { userId, role } = (req as AuthenticatedRequest).user;

    const hasAccess = await classService.verifyClassAccess(classId, userId, role);
    if (!hasAccess) throw new AppError('Forbidden: You do not have access to this class', 403);

    const data = await pointsService.bulkAdjustPoints(classId, studentIds, delta, userId, reason);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getLeaderboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { idOrSlug } = req.params;
    const data = await pointsService.getLeaderboard(idOrSlug);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getPublicData = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { slug } = req.params;
        const data = await pointsService.getPublicData(slug);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
}

export const getStudentHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { slug, studentId } = req.params;
        const data = await pointsService.getStudentHistory(slug, studentId);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
}
