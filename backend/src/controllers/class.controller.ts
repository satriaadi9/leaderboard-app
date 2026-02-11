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
        const { userId, role } = (req as AuthenticatedRequest).user;
        const data = await classService.listClasses(userId, role);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
}

export const updateClass = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        // Optimization: In a real app we might check if user owns this class or is superadmin here
        // For now relying on service or simple filtering. 
        // Ideally middleare should check ownership if not superadmin.
        const data = await classService.updateClass(id, name);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

export const deleteClass = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        await classService.deleteClass(id);
        res.json({ success: true, message: 'Class deleted successfully' });
    } catch (error) {
        next(error);
    }
};

export const importStudents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { students } = req.body;
    const { id: classId } = req.params;
    const data = await classService.importStudents(classId, students);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const removeStudent = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id: classId, studentId } = req.params;
        await classService.removeStudent(classId, studentId);
        res.json({ success: true, message: 'Student removed from class' });
    } catch (error) {
        next(error);
    }
};

export const removeStudents = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id: classId } = req.params;
        const { studentIds } = req.body;
        await classService.removeStudents(classId, studentIds);
        res.json({ success: true, message: 'Students removed from class' });
    } catch (error) {
        next(error);
    }
};
