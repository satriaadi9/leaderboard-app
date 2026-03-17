import { Router } from 'express';
import * as authController from '@/controllers/auth.controller';
import { validate } from '@/middleware/validate';
import { loginSchema, registerSchema, forgotPasswordSchema, verifyOtpSchema, resetPasswordSchema } from '@/validators';

const router = Router();

router.post('/login', validate(loginSchema), authController.login);
router.post('/register', validate(registerSchema), authController.register);
router.post('/google', authController.googleLogin);
router.post('/forgot-password', validate(forgotPasswordSchema), authController.requestPasswordReset);
router.post('/verify-otp', validate(verifyOtpSchema), authController.verifyOtp);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);

export default router;
