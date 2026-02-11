import { prisma } from '@/config/prisma';
import { redis } from '@/config/redis';
import { AppError } from '@/utils/errors';

export const pointsService = {
  async adjustPoints(
    classId: string,
    studentId: string,
    delta: number,
    adminId: string,
    reason: string
  ) {
    // Validate enrollment
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        classId_studentId: { classId, studentId },
      },
    });
    if (!enrollment) throw new AppError('Student not enrolled in this class', 400);

    // Transaction: Add ledger entry AND update total
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Ledger Entry
      const ledger = await tx.pointsLedger.create({
        data: {
          classId,
          studentId,
          createdByUserId: adminId,
          delta,
          reason,
        },
      });

      // 2. Update ClassPointsTotal (Upsert ensures it exists)
      const total = await tx.classPointsTotal.upsert({
        where: {
          classId_studentId: { classId, studentId },
        },
        create: {
          classId,
          studentId,
          total: delta,
        },
        update: {
          total: { increment: delta },
        },
      });

      return { ledger, total };
    });

    // Invalidate cache
    const cacheKey = `leaderboard:${classId}`;
    await redis.del(cacheKey);

    return result;
  },

  async getLeaderboard(classIdOrSlug: string) {
    // Determine if ID or Slug
    let classId = classIdOrSlug;

    // Check if it looks like a CUID (starts with c, 25 chars) or UUID
    const isId = /^c[a-z0-9]{24}$/.test(classIdOrSlug) || /^[0-9a-f]{8}-/i.test(classIdOrSlug);

    if (!isId) {
        // Treat as slug
        const cls = await prisma.class.findUnique({ where: { publicSlug: classIdOrSlug }});
        if (!cls) throw new AppError('Class not found', 404);
        classId = cls.id;
    } else {
        // Verify ID exists
        const cls = await prisma.class.findUnique({ where: { id: classIdOrSlug } });
        if (!cls) throw new AppError('Class not found', 404);
    }

    const cacheKey = `leaderboard:${classId}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    // Fetch from DB
    const leaderboard = await prisma.classPointsTotal.findMany({
      where: { classId },
      include: {
        student: { select: { id: true, name: true, email: true } },
      },
      orderBy: { total: 'desc' },
    });

    // Cache for 60 seconds (high traffic optimization)
    await redis.setex(cacheKey, 60, JSON.stringify(leaderboard));

    return leaderboard;
  },
};
