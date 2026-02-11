import { prisma } from '@/config/prisma';
import { generateToken, comparePassword, hashPassword } from '@/utils/auth';
import { AppError } from '@/utils/errors';
import { UserRole } from '@prisma/client';

export const authService = {
  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await comparePassword(password, user.password))) {
      throw new AppError('Invalid credentials', 401);
    }
    const token = generateToken({ userId: user.id, role: user.role });
    return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
  },

  async register(email: string, name: string, password: string) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new AppError('Email already in use', 400);

    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role: UserRole.ADMIN,
      },
    });
    const token = generateToken({ userId: user.id, role: user.role });
    return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
  },
};
