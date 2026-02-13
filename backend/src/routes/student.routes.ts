import { Router } from 'express';
import * as studentController from '@/controllers/student.controller';
import { validate } from '@/middleware/validate';
import { getStudentProgressSchema } from '@/validators/student.validators';

const router = Router();

// Public route for student progress card
router.get('/:id', validate(getStudentProgressSchema), studentController.getStudentProgress);

export default router;
