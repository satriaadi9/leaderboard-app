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
      const updateData: any = {
        total: { increment: delta },
      };
      
      // If delta is negative, permanently mark hasNegativeHistory as true
      if (delta < 0) {
          updateData.hasNegativeHistory = true;
      }

      const total = await tx.classPointsTotal.upsert({
        where: {
          classId_studentId: { classId, studentId },
        },
        create: {
          classId,
          studentId,
          total: delta,
          hasNegativeHistory: delta < 0,
        } as any,
        update: updateData,
      });      return { ledger, total };
    });

    // Invalidate cache
    const cacheKey = `leaderboard:${classId}`;
    await redis.del(cacheKey);
    // Also invalidate public cache if any
    const cls = await prisma.class.findUnique({ where: { id: classId } });
    if (cls?.publicSlug) {
        await redis.del(`public:${cls.id}`);
    }

    // Publish update event for SSE
    await redis.publish('leaderboard-updates', JSON.stringify({ classId }));

    return result;
  },

  async bulkAdjustPoints(
      classId: string,
      studentIds: string[],
      delta: number,
      adminId: string,
      reason: string
  ) {
      if (studentIds.length === 0) return;

      const result = await prisma.$transaction(async (tx) => {
          const updates = [];
          for (const studentId of studentIds) {
             // 1. Create Ledger
             const ledger = await tx.pointsLedger.create({
                 data: { classId, studentId, createdByUserId: adminId, delta, reason }
             });
             
             // 2. Upsert Total
             const updateData: any = { total: { increment: delta } };
             if (delta < 0) updateData.hasNegativeHistory = true;

             const total = await tx.classPointsTotal.upsert({
                 where: { classId_studentId: { classId, studentId } },
                 create: { classId, studentId, total: delta, hasNegativeHistory: delta < 0 } as any,
                 update: updateData
             });
             updates.push({ ledger, total });
          }
          return updates;
      });

      // Invalidate cache and public slug
      const cacheKey = `leaderboard:${classId}`;
      await redis.del(cacheKey);
      const cls = await prisma.class.findUnique({ where: { id: classId } });
      if (cls?.publicSlug) {
          await redis.del(`public:${cls.id}`);
      }
      
      await redis.publish('leaderboard-updates', JSON.stringify({ classId }));
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
    const rawLeaderboard = await prisma.classPointsTotal.findMany({
      where: { classId },
      include: {
        student: { select: { id: true, name: true, email: true } },
      },
    });

    // Fetch weekly activity for badges
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const weeklyActivity = await prisma.pointsLedger.groupBy({
        by: ['studentId'],
        where: {
            classId,
            createdAt: { gte: weekAgo }
        },
        _sum: { delta: true }
    });
    
    const weeklyMap = new Map<string, number>();
    weeklyActivity.forEach(w => {
        weeklyMap.set(w.studentId, w._sum.delta || 0);
    });

    const leaderboard = rawLeaderboard.sort((a, b) => {
        // 1. Total Points (Desc)
        if (b.total !== a.total) {
            return b.total - a.total;
        }
        
        if (a.total === 0) {
            if ((a as any).hasNegativeHistory !== (b as any).hasNegativeHistory) return ((a as any).hasNegativeHistory ? -1 : 1);
        } else {
            if ((a as any).hasNegativeHistory !== (b as any).hasNegativeHistory) return ((a as any).hasNegativeHistory ? 1 : -1);
        }
        
        // 3. Time Priority
        return a.updatedAt.getTime() - b.updatedAt.getTime();
    });

    // Determine Badges
    const topStudentId = leaderboard.length > 0 && leaderboard[0].total > 0 ? leaderboard[0].studentId : null;
    
    let maxGain = -1;
    let mostImprovedIds: string[] = [];
    weeklyMap.forEach((gain, studentId) => {
        if (gain > maxGain && gain > 0) {
            maxGain = gain;
            mostImprovedIds = [studentId];
        } else if (gain === maxGain && gain > 0) {
            mostImprovedIds.push(studentId);
        }
    });
    
    // Biggest Climber
    const prevLeaderboard = rawLeaderboard.map(curr => {
        const gain = weeklyMap.get(curr.studentId) || 0;
        return {
            studentId: curr.studentId,
            prevTotal: curr.total - gain, 
        };
    }).sort((a, b) => b.prevTotal - a.prevTotal);
    
    let maxClimb = -1;
    let biggestClimberIds: string[] = [];
    leaderboard.forEach((curr, currIndex) => {
        const prevIndex = prevLeaderboard.findIndex(p => p.studentId === curr.studentId);
        if (prevIndex !== -1) {
            const climb = prevIndex - currIndex;
            if (climb > maxClimb && climb > 0) {
                maxClimb = climb;
                biggestClimberIds = [curr.studentId];
            } else if (climb === maxClimb && climb > 0) {
                biggestClimberIds.push(curr.studentId);
            }
        }
    });

    const decoratedLeaderboard = leaderboard.map(item => {
        const badges: string[] = [];
        if (item.studentId === topStudentId) badges.push('TOP_1');
        if (mostImprovedIds.includes(item.studentId)) badges.push('MOST_IMPROVED');
        if (biggestClimberIds.includes(item.studentId)) badges.push('BIGGEST_CLIMBER');
        
        return { ...item, badges };
    });

    // Cache for 60 seconds (high traffic optimization)
    await redis.setex(cacheKey, 60, JSON.stringify(decoratedLeaderboard));

    return decoratedLeaderboard;
  },

  async getPublicData(slug: string) {
      const cls = await prisma.class.findUnique({ 
          where: { publicSlug: slug },
          include: {
              createdBy: { select: { name: true } },
              // Prisma types might not be updated yet
              assistants: { select: { name: true } }
          }
      } as any);
      if (!cls) throw new AppError('Class not found', 404);
      if (!(cls as any).isPublic) throw new AppError('This leaderboard is private', 403);

      const cacheKey = `public:${cls.id}`;
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);

      const rawLeaderboard = await prisma.classPointsTotal.findMany({
          where: { classId: cls.id },
          include: {
              student: { select: { id: true, name: true, nim: true } } 
          },
      });

      // Fetch weekly activity for badges
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const weeklyActivity = await prisma.pointsLedger.groupBy({
          by: ['studentId'],
          where: {
              classId: cls.id,
              
              createdAt: { gte: weekAgo }
          },
          _sum: { delta: true }
      });
      
      const weeklyMap = new Map<string, number>();
      weeklyActivity.forEach(w => {
          weeklyMap.set(w.studentId, w._sum.delta || 0);
      });

      // Calculate logic for sorting and badges
      const leaderboard = rawLeaderboard.sort((a, b) => {
          if (b.total !== a.total) return b.total - a.total;
          
          // Need to handle hasNegativeHistory type safety by checking if property exists or default false
          const aNeg = (a as any).hasNegativeHistory || false;
          const bNeg = (b as any).hasNegativeHistory || false;

          if (a.total === 0) {
            if (aNeg !== bNeg) return (aNeg ? -1 : 1);
          } else {
            if (aNeg !== bNeg) return (aNeg ? 1 : -1);
          }
          
          return a.updatedAt.getTime() - b.updatedAt.getTime();
      });

      // Determine Badges
      // 1. Top 1
      const topStudentId = leaderboard.length > 0 && leaderboard[0].total > 0 ? leaderboard[0].studentId : null;
      
      // 2. Most Improved (Highest Weekly Gain > 0)
      let maxGain = -1;
      let mostImprovedIds: string[] = [];
      
      weeklyMap.forEach((gain, studentId) => {
          if (gain > maxGain && gain > 0) { // Must be positive gain
              maxGain = gain;
              mostImprovedIds = [studentId];
          } else if (gain === maxGain && gain > 0) {
              mostImprovedIds.push(studentId);
          }
      });
      
      // 3. Biggest Climber (Rank Gain)
      // Reconstruct previous leaderboard
      const prevLeaderboard = rawLeaderboard.map(curr => {
          const gain = weeklyMap.get(curr.studentId) || 0;
          return {
              studentId: curr.studentId,
              prevTotal: curr.total - gain, // Assuming total is accurate sum of all ledgers? Yes if no manual overrides other than adjustments
              // We need simplified sorting for prev rank approximation
          };
      }).sort((a, b) => b.prevTotal - a.prevTotal); // Simplified sort for speed
      
      let maxClimb = -1;
      let biggestClimberIds: string[] = [];
      
      leaderboard.forEach((curr, currIndex) => {
          const prevIndex = prevLeaderboard.findIndex(p => p.studentId === curr.studentId);
          if (prevIndex !== -1) {
              const climb = prevIndex - currIndex;
              if (climb > maxClimb && climb > 0) { // Must have climbed at least 1 spot
                  maxClimb = climb;
                  biggestClimberIds = [curr.studentId];
              } else if (climb === maxClimb && climb > 0) {
                  biggestClimberIds.push(curr.studentId);
              }
          }
      });

      // Decorate leaderboard with badges
      const decoratedLeaderboard = leaderboard.map(item => {
          const badges: string[] = [];
          if (item.studentId === topStudentId) badges.push('TOP_1');
          if (mostImprovedIds.includes(item.studentId)) badges.push('MOST_IMPROVED');
          if (biggestClimberIds.includes(item.studentId)) badges.push('BIGGEST_CLIMBER');
          
          return { ...item, badges };
      });

      // Calculate stats
      const totalPoints = leaderboard.reduce((sum, item) => sum + item.total, 0);
      const avgPoints = leaderboard.length > 0 ? (totalPoints / leaderboard.length) : 0;
      
      const result = {
          class: {
              name: cls.name,
              description: cls.description,
              createdAt: cls.createdAt,
              owner: (cls as any).createdBy?.name || 'Unknown',
              assistants: ((cls as any).assistants || []).map((a: any) => a.name)
          },
          stats: {
              totalPoints,
              averagePoints: Math.round(avgPoints * 10) / 10,
              studentCount: leaderboard.length
          },
          leaderboard: decoratedLeaderboard
      };

      await redis.setex(cacheKey, 30, JSON.stringify(result));
      return result;
  },

  async getStudentHistory(slug: string, studentId: string) {
      const cls = await prisma.class.findUnique({ where: { publicSlug: slug } }) as any;
      if (!cls) throw new AppError('Class not found', 404);
      if (!cls.isPublic) throw new AppError('This leaderboard is private', 403);

      // Verify student belongs to class (optional but good)
      
      const history = await prisma.pointsLedger.findMany({
          where: { classId: cls.id, studentId },
          orderBy: { createdAt: 'desc' },
          select: {
              id: true,
              delta: true,
              reason: true,
              createdAt: true,
              createdBy: { select: { name: true, role: true } }
          }
      });
      
      return history;
  }
};
