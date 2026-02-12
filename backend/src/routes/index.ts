import { Router } from 'express';
import authRoutes from './auth.routes';
import classRoutes from './class.routes';
import userRoutes from './user.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/classes', classRoutes);

export default router;
