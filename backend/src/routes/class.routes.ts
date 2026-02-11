import { Router } from 'express';
import * as classController from '@/controllers/class.controller';
import * as pointsController from '@/controllers/points.controller';
import { validate } from '@/middleware/validate';
import { authenticate, authorize } from '@/middleware/auth';
import { createClassSchema, enrollStudentSchema, adjustPointsSchema, getLeaderboardSchema, importStudentsSchema, removeStudentSchema, removeStudentsSchema, updateClassSchema, deleteClassSchema } from '@/validators';
import { UserRole } from '@prisma/client';

const router = Router();

// Public Leaderboard
router.get('/:idOrSlug/leaderboard', validate(getLeaderboardSchema), pointsController.getLeaderboard);

// Admin Routes
router.use(authenticate);
// Allow ADMIN and SUPERADMIN
router.use(authorize([UserRole.ADMIN, UserRole.SUPERADMIN]));

router.post('/', validate(createClassSchema), classController.createClass);
router.get('/', classController.listClasses);
router.patch('/:id', validate(updateClassSchema), classController.updateClass);
router.delete('/:id', validate(deleteClassSchema), classController.deleteClass);

router.post('/:id/enroll', validate(enrollStudentSchema), classController.enrollStudent);
router.post('/:id/import', validate(importStudentsSchema), classController.importStudents);
router.delete('/:id/students/:studentId', validate(removeStudentSchema), classController.removeStudent);
router.post('/:id/students/bulk-delete', validate(removeStudentsSchema), classController.removeStudents);
router.post('/:id/points', validate(adjustPointsSchema), pointsController.adjustPoints);

export default router;
