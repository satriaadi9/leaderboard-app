import { prisma } from '@/config/prisma';
import { Prisma } from '@prisma/client';

export const eventService = {
  async logEvent(action: string, details: Prisma.InputJsonValue = {}, userId?: string) {
    const event = await prisma.eventLog.create({
      data: {
        action,
        details,
        userId,
      },
    });
    return event;
  },

  async getEvents(limit: number = 100, offset: number = 0) {
    const events = await prisma.eventLog.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
    });
    const total = await prisma.eventLog.count();
    
    return { events, total };
  }
};
