import { Request, Response, NextFunction } from 'express';
import { pointsService } from '@/services/points.service';
import { AuthenticatedRequest } from '@/middleware/auth';

export const adjustPoints = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studentId, delta, reason } = req.body;
    const { id: classId } = req.params;
    const adminId = (req as AuthenticatedRequest).user.userId;

    const data = await pointsService.adjustPoints(classId, studentId, delta, adminId, reason);
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
