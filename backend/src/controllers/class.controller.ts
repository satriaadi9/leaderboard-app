import { Request, Response, NextFunction } from 'express';
import { classService } from '@/services/class.service';
import { AuthenticatedRequest } from '@/middleware/auth';

export const createClass = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description } = req.body;
    const adminId = (req as AuthenticatedRequest).user.userId;
    const data = await classService.createClass(name, description, adminId);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const enrollStudent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studentName, studentEmail } = req.body;
    const { id: classId } = req.params;
    const data = await classService.enrollStudent(classId, studentName, studentEmail);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const listClasses = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const adminId = (req as AuthenticatedRequest).user.userId;
        const data = await classService.listClasses(adminId);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
}
