import { Router } from 'express';
import * as classController from '@/controllers/class.controller';
import * as pointsController from '@/controllers/points.controller';
import { validate } from '@/middleware/validate';
import { authenticate, authorize } from '@/middleware/auth';
import { createClassSchema, enrollStudentSchema, adjustPointsSchema, getLeaderboardSchema } from '@/validators';
import { UserRole } from '@prisma/client';

const router = Router();

// Public Leaderboard
router.get('/:idOrSlug/leaderboard', validate(getLeaderboardSchema), pointsController.getLeaderboard);

// Admin Routes
router.use(authenticate);
router.use(authorize([UserRole.ADMIN]));

router.post('/', validate(createClassSchema), classController.createClass);
router.get('/', classController.listClasses);
router.post('/:id/enroll', validate(enrollStudentSchema), classController.enrollStudent);
router.post('/:id/points', validate(adjustPointsSchema), pointsController.adjustPoints);

export default router;
