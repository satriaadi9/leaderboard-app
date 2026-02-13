import { Request, Response, NextFunction } from 'express';
import { studentService } from '@/services/student.service';

export const getStudentProgress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = await studentService.getStudentProgress(id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
