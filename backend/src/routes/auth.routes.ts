import { Router } from 'express';
import * as authController from '@/controllers/auth.controller';
import { validate } from '@/middleware/validate';
import { loginSchema, registerSchema } from '@/validators';

const router = Router();

router.post('/login', validate(loginSchema), authController.login);
router.post('/register', validate(registerSchema), authController.register);

export default router;
