import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireSuperAdmin } from '@/middleware/auth';
import { validate } from '@/middleware/validate';
import {
  updateProfile,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser
} from '@/controllers/user.controller';
import { UserRole } from '@prisma/client';

const router = Router();

// Profile Routes (Authenticated Users)
const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    oldPassword: z.string().optional(),
    newPassword: z.string().min(6).optional(),
  }).refine((data) => {
    if (data.newPassword && !data.oldPassword) return false;
    return true;
  }, {
    message: "Old password is required to set a new password",
    path: ["oldPassword"]
  })
});

router.patch('/profile', authenticate, validate(updateProfileSchema), updateProfile);

// Superadmin Routes (User Management)
const createUserSchema = z.object({
  body: z.object({
    email: z.string().email(),
    name: z.string().min(2),
    password: z.string().min(6),
    role: z.nativeEnum(UserRole).default(UserRole.ADMIN),
  })
});

const updateUserSchema = z.object({
  params: z.object({
    id: z.string().cuid(),
  }),
  body: z.object({
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
    password: z.string().min(6).optional(),
    role: z.nativeEnum(UserRole).optional(),
  })
});

const deleteUserSchema = z.object({
  params: z.object({
    id: z.string().cuid(),
  })
});

router.use(authenticate, requireSuperAdmin);

router.get('/', getAllUsers);
router.post('/', validate(createUserSchema), createUser);
router.patch('/:id', validate(updateUserSchema), updateUser);
router.delete('/:id', validate(deleteUserSchema), deleteUser);

export default router;
