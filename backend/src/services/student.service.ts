import { prisma } from '@/config/prisma';
import { AppError } from '@/utils/errors';

export const studentService = {
  async getStudentProgress(studentId: string) {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        enrollments: {
          include: {
            class: true,
          },
        },
        pointsTotals: true,
      },
    });

    if (!student) {
      throw new AppError('Student not found', 404);
    }

    // Process each class
    const classesProgress = await Promise.all(
      student.enrollments.map(async (enrollment) => {
        const classId = enrollment.classId;
        const className = enrollment.class.name;
        const totalPoints =
          student.pointsTotals.find((pt) => pt.classId === classId)?.total || 0;

        // Calculate Rank
        const higherScorers = await prisma.classPointsTotal.count({
          where: {
            classId,
            total: { gt: totalPoints },
          },
        });
        const rank = higherScorers + 1;

        // Calculate Trend (Last 7 days vs Previous 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

        const last7DaysPoints = await prisma.pointsLedger.aggregate({
          _sum: { delta: true },
          where: {
            classId,
            studentId,
            createdAt: {
              gte: sevenDaysAgo,
            },
          },
        });

        const prev7DaysPoints = await prisma.pointsLedger.aggregate({
            _sum: { delta: true },
            where: {
              classId,
              studentId,
              createdAt: {
                gte: fourteenDaysAgo,
                lt: sevenDaysAgo
              },
            },
          });

        const recentGain = last7DaysPoints._sum.delta || 0;
        const previousGain = prev7DaysPoints._sum.delta || 0;
        
        let trend: 'up' | 'down' | 'neutral' = 'neutral';
        if (recentGain > previousGain) trend = 'up';
        if (recentGain < previousGain) trend = 'down';

        // Level Logic (Every 1000 points is a level)
        const level = Math.floor(Math.max(0, totalPoints) / 1000) + 1;
        const nextLevelThreshold = level * 1000;
        const pointsInCurrentLevel = Math.max(0, totalPoints) % 1000;
        const progressPercent = (pointsInCurrentLevel / 1000) * 100;

        return {
          classId,
          className,
          isArchived: enrollment.class.isArchived,
          rank,
          totalPoints,
          level,
          nextLevelThreshold,
          progressPercent,
          recentGain,
          trend,
        };
      })
    );

    return {
      student: {
        id: student.id,
        name: student.name,
        nim: student.nim,
      },
      classes: classesProgress,
    };
  },
};
