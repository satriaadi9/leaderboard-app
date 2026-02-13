import { Router } from 'express';
import authRoutes from './auth.routes';
import classRoutes from './class.routes';
import userRoutes from './user.routes';
import studentRoutes from './student.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/classes', classRoutes);
router.use('/students', studentRoutes);

export default router;
