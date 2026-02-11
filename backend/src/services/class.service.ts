import { prisma } from '@/config/prisma';
import { AppError } from '@/utils/errors';
import { UserRole } from '@prisma/client';
import { randomBytes } from 'crypto';
import { redis } from '@/config/redis';

export const classService = {
  async createClass(name: string, description: string | undefined, adminId: string) {
    const suffix = randomBytes(4).toString('hex').slice(0, 6);
    const publicSlug = `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${suffix}`;
    const newClass = await prisma.class.create({
      data: {
        name,
        description,
        publicSlug,
        createdByUserId: adminId,
      },
    });
    return newClass;
  },

  async enrollStudent(classId: string, studentName: string, studentEmail: string) {
    const email = studentEmail.toLowerCase().trim();

    const result = await prisma.$transaction(async (tx) => {
      // Check if student exists or create
      let student = await tx.student.findFirst({ where: { email } });
      if (!student) {
        const nim = randomBytes(4).toString('hex'); // Generate random NIM
        student = await tx.student.create({
          data: { name: studentName, email, nim },
        });
      }

      // Check enrollment
      const existingEnrollment = await tx.enrollment.findUnique({
        where: {
          classId_studentId: {
            studentId: student.id,
            classId,
          },
        },
      });
      if (existingEnrollment) throw new AppError('Student already enrolled', 400);

      // Enroll
      const enrollment = await tx.enrollment.create({
        data: {
          classId,
          studentId: student.id,
        },
      });

      // Initialize points total
      await tx.classPointsTotal.create({
        data: {
          classId,
          studentId: student.id,
          total: 0,
        },
      });

      return { enrollment, student };
    });

    // Invalidate leaderboard cache so the new student shows up immediately
    await redis.del(`leaderboard:${classId}`);

    return result;
  },

  async getClassDetails(classId: string) {
    const cls = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        _count: { select: { enrollments: true } },
      },
    });
    if (!cls) throw new AppError('Class not found', 404);
    return cls;
  },
  
  async listClasses(adminId: string) {
      return prisma.class.findMany({
          where: { createdByUserId: adminId },
          orderBy: { createdAt: 'desc' }
      });
  }
};
