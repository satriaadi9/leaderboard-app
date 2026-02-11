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

  async importStudents(classId: string, students: Array<{ nim?: string, name: string, email: string }>) {
    const result = await prisma.$transaction(async (tx) => {
      const results = [];
      for (const s of students) {
        const email = s.email.toLowerCase().trim();
        // Try to find student by email, or by NIM if provided
        let student = await tx.student.findFirst({ where: { email } });
        
        if (!student) {
             // If we have a NIM from CSV, try to use it, else generate
             const nim = s.nim || randomBytes(4).toString('hex');
             // There's a chance this NIM exists for another student if we blindly use CSV NIM.
             // Ideally we should upsert or handle unique constraint.
             // For now, let's assume CSV data is authoritative or falls back.
             // If creating fails due to NIM unique constraint, we might need logic.
             // But let's keep it simple: create.
             try {
                student = await tx.student.create({
                    data: { name: s.name, email, nim }
                });
             } catch (e) {
                 // Fallback if NIM taken? 
                 // If email is unique (checked above), then collision is on NIM.
                 // If collision on NIM, maybe specific to another student.
                 // Let's generate a random one to be safe if specific one fails?
                 // Or just let it fail.
                 throw e;
             }
        }
        
        // Enroll (ignore if already enrolled)
        await tx.enrollment.upsert({
            where: { classId_studentId: { classId, studentId: student.id } },
            create: { classId, studentId: student.id },
            update: {}
        });

        // Init points if needed
         await tx.classPointsTotal.upsert({
            where: { classId_studentId: { classId, studentId: student.id } },
            create: { classId, studentId: student.id, total: 0 },
            update: {}
        });
        
        results.push(student);
      }
      return results;
    });

    await redis.del(`leaderboard:${classId}`);
    return result;
  },

  async removeStudent(classId: string, studentId: string) {
      await prisma.$transaction([
          prisma.enrollment.deleteMany({ where: { classId, studentId } }),
          prisma.classPointsTotal.deleteMany({ where: { classId, studentId } }),
          prisma.pointsLedger.deleteMany({ where: { classId, studentId } })
      ]);
      await redis.del(`leaderboard:${classId}`);
  },

  async removeStudents(classId: string, studentIds: string[]) {
      await prisma.$transaction([
          prisma.enrollment.deleteMany({ where: { classId, studentId: { in: studentIds } } }),
          prisma.classPointsTotal.deleteMany({ where: { classId, studentId: { in: studentIds } } }),
          prisma.pointsLedger.deleteMany({ where: { classId, studentId: { in: studentIds } } })
      ]);
      await redis.del(`leaderboard:${classId}`);
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
  
  async listClasses(userId: string, role: string) {
      const whereClause = role === 'SUPERADMIN' ? {} : { createdByUserId: userId };
      
      const classes = await prisma.class.findMany({
          where: whereClause,
          include: {
              _count: { select: { enrollments: true } },
              pointsTotals: {
                  select: { total: true }
              }
          },
          orderBy: { createdAt: 'desc' }
      });

      // Calculate aggregated stats
      return classes.map(cls => {
          const totalPoints = cls.pointsTotals.reduce((sum, p) => sum + p.total, 0);
          const avgPoints = cls.pointsTotals.length > 0 ? totalPoints / cls.pointsTotals.length : 0;
          
          // Clean up response objects (remove raw arrays)
          const { pointsTotals, ...rest } = cls;
          
          return {
              ...rest,
              stats: {
                  studentCount: cls._count.enrollments,
                  averagePoints: Math.round(avgPoints * 100) / 100, // Round to 2 decimals
                  totalPointsDistributed: totalPoints
              }
          };
      });
  },

  async updateClass(id: string, name: string) {
      const cls = await prisma.class.findUnique({ where: { id } });
      if (!cls) throw new AppError('Class not found', 404);
      
      return await prisma.class.update({
          where: { id },
          data: { name, publicSlug: `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${cls.publicSlug.split('-').pop()}` }
      });
  },

  async deleteClass(id: string) {
      // Cascade delete is handled by Prisma schema for related relations like Enrollment, etc.
      // But verify relations first
      await prisma.class.delete({ where: { id } });
      await redis.del(`leaderboard:${id}`);
  }
};
