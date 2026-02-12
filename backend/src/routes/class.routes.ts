import { Router } from 'express';
import * as classController from '@/controllers/class.controller';
import * as pointsController from '@/controllers/points.controller';
import { validate } from '@/middleware/validate';
import { authenticate, authorize } from '@/middleware/auth';
import { createClassSchema, enrollStudentSchema, adjustPointsSchema, adjustPointsBulkSchema, getLeaderboardSchema, importStudentsSchema, removeStudentSchema, removeStudentsSchema, updateClassSchema, deleteClassSchema, getPublicDataSchema, getPublicHistorySchema, addAssistantSchema, removeAssistantSchema } from '@/validators';
import { UserRole } from '@prisma/client';

const router = Router();

// Public Leaderboard
router.get('/:idOrSlug/leaderboard', validate(getLeaderboardSchema), pointsController.getLeaderboard); // Legacy/Admin use?
router.get('/public/:slug', validate(getPublicDataSchema), pointsController.getPublicData);
router.get('/public/:slug/stream', classController.streamClassUpdates);
router.get('/public/:slug/students/:studentId/history', validate(getPublicHistorySchema), pointsController.getStudentHistory);

// Admin Routes
router.use(authenticate);
// Allow ADMIN, SUPERADMIN, and STUDENT_ASSISTANT
router.use(authorize([UserRole.ADMIN, (UserRole as any).SUPERADMIN, (UserRole as any).STUDENT_ASSISTANT]));

router.post('/', validate(createClassSchema), classController.createClass);
router.get('/', classController.listClasses);
router.get('/:id', classController.getClass);
router.patch('/:id', validate(updateClassSchema), classController.updateClass);
router.delete('/:id', validate(deleteClassSchema), classController.deleteClass);

router.post('/:id/assistants', validate(addAssistantSchema), classController.addAssistant);
router.delete('/:id/assistants/:userId', validate(removeAssistantSchema), classController.removeAssistant);

router.post('/:id/enroll', validate(enrollStudentSchema), classController.enrollStudent);
router.post('/:id/import', validate(importStudentsSchema), classController.importStudents);
router.delete('/:id/students/:studentId', validate(removeStudentSchema), classController.removeStudent);
router.post('/:id/students/bulk-delete', validate(removeStudentsSchema), classController.removeStudents);
router.post('/:id/points', validate(adjustPointsSchema), pointsController.adjustPoints);
router.post('/:id/points/bulk', validate(adjustPointsBulkSchema), pointsController.adjustPointsBulk);

export default router;
