import { Request, Response, NextFunction } from 'express';
import { classService } from '@/services/class.service';
import { AuthenticatedRequest } from '@/middleware/auth';
import { sseService } from '@/services/sse.service';
import { prisma } from '@/config/prisma';
import { AppError } from '@/utils/errors';
import { UserRole } from '@prisma/client';

export const createClass = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role, userId } = (req as AuthenticatedRequest).user;
    if (role === (UserRole as any).STUDENT_ASSISTANT) throw new AppError('Student Assistants cannot create classes', 403);
    
    const { name, description } = req.body;
    const data = await classService.createClass(name, description, userId);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const deleteClass = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { role, userId } = (req as AuthenticatedRequest).user;
        if (role === (UserRole as any).STUDENT_ASSISTANT) throw new AppError('Student Assistants cannot delete classes', 403);

        const { id } = req.params;
        const cls = await classService.getClassDetails(id);
        if (role !== (UserRole as any).SUPERADMIN && cls.createdByUserId !== userId) {
             throw new AppError('Only the owner can delete this class', 403);
        }

        await classService.deleteClass(id);
        res.json({ success: true, message: 'Class deleted successfully' });
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
};

export const getClass = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const data = await classService.getClassDetails(id);
        res.json({ success: true, data });
    } catch (error) {
        next(error);
    }
};

export const updateClass = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { name, publicSlug, isPublic, isArchived } = req.body;
        const data = await classService.updateClass(id, { name, publicSlug, isPublic, isArchived });
        res.json({ success: true, data });
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

export const addAssistant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: classId } = req.params;
    const { name, email, password } = req.body;
    
    const { userId, role } = (req as AuthenticatedRequest).user;
    const cls = await classService.getClassDetails(classId);
    
    if (role !== (UserRole as any).SUPERADMIN && cls.createdByUserId !== userId) {
        throw new AppError('Only the class owner can add assistants', 403);
    }

    const data = await classService.addAssistant(classId, email, name, password);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const removeAssistant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: classId, userId: assistantId } = req.params;
    
    const { userId, role } = (req as AuthenticatedRequest).user;
    const cls = await classService.getClassDetails(classId);

    if (role !== (UserRole as any).SUPERADMIN && cls.createdByUserId !== userId) {
        throw new AppError('Only the class owner can remove assistants', 403);
    }

    await classService.removeAssistant(classId, assistantId);
    res.json({ success: true, message: 'Assistant removed' });
  } catch (error) {
    next(error);
  }
};

export const streamClassUpdates = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { slug } = req.params;
        // Use any cast until Prisma types are fully synced
        const cls = await prisma.class.findUnique({ 
            where: { publicSlug: slug },
            // Force strict selection of ID
            select: { id: true }
        }) as any;

        if (!cls) throw new AppError('Class not found', 404);
        // Manually check isPublic if not selected, or re-fetch if needed.
        // Actually, let's just fetch everything if select is broken for isPublic
        
        // Refetch full object to be safe and use untyped access for isPublic
        const fullCls = await prisma.class.findUnique({
            where: { id: cls.id }
        }) as any;
        
        if (!fullCls.isPublic) throw new AppError('Class not public', 403);
        
        sseService.addClient(fullCls.id, res);
    } catch (error) {
        next(error);
    }
};
