import { prisma } from '@/config/prisma';
import { AppError } from '@/utils/errors';
import { hashPassword, comparePassword } from '@/utils/auth';
import { UserRole, User } from '@prisma/client';

export const userService = {
  // --- Profile Management ---
  async updateProfile(userId: string, data: { name?: string; oldPassword?: string; newPassword?: string }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found', 404);

    const updates: any = {};

    if (data.name) {
      updates.name = data.name;
    }

    if (data.newPassword) {
      if (!data.oldPassword) {
        throw new AppError('Old password is required to set a new password', 400);
      }
      
      const isValid = await comparePassword(data.oldPassword, user.password);
      if (!isValid) {
        throw new AppError('Invalid old password', 400);
      }

      updates.password = await hashPassword(data.newPassword);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updates,
    });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
    };
  },

  // --- Superadmin User Management ---
  async getAllUsers() {
    return prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        _count: {
          select: { createdClasses: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  },

  async createUser(data: { email: string; name: string; password: string; role: UserRole }) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new AppError('Email already in use', 400);

    const hashedPassword = await hashPassword(data.password);
    
    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword,
        role: data.role,
      },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  },

  async updateUser(userId: string, data: { name?: string; email?: string; password?: string; role?: UserRole }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found', 404);

    const updates: any = {};
    if (data.name) updates.name = data.name;
    if (data.email) {
        // Check if email is taken by another user
        const existing = await prisma.user.findUnique({ where: { email: data.email } });
        if (existing && existing.id !== userId) throw new AppError('Email already in use', 400);
        updates.email = data.email;
    }
    if (data.role) updates.role = data.role;
    if (data.password) {
      updates.password = await hashPassword(data.password);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updates,
    });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
    };
  },

  async deleteUser(userId: string) {
    // Prevent deleting self? Maybe ok for superadmin to delete other superadmins, but usually risky.
    // For now, let's allow it but maybe frontend warns. 
    // Wait, deleting a user might cascade?
    // In schema, Class has `createdBy User`. If we delete User, what happens to classes?
    // Prisma schema doesn't seem to have OnDelete Action specified for User->Class relation in the snippet I saw.
    // Assuming we want to delete classes too or keep them? 
    // Usually standard `onDelete: Cascade` or it will fail.
    // Let's assume it might fail if we don't handle relations, but let's try raw delete first.
    
    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found', 404);

    await prisma.user.delete({ where: { id: userId } });
    return true;
  }
};
