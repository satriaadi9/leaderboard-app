import { describe, it, expect, vi, beforeEach } from 'vitest';
import { eventService } from '../event.service';
import { prisma } from '@/config/prisma';

// Mock prisma
vi.mock('@/config/prisma', () => ({
  prisma: {
    eventLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

describe('eventService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('logEvent', () => {
    it('should create an event log successfully', async () => {
      const mockEvent = {
        id: 'test-id',
        action: 'PAGE_VIEW',
        details: { path: '/dashboard' },
        userId: 'user-1',
        createdAt: new Date(),
      };

      ((prisma as any).eventLog.create as any).mockResolvedValue(mockEvent);

      const result = await eventService.logEvent('PAGE_VIEW', { path: '/dashboard' }, 'user-1');

      expect((prisma as any).eventLog.create).toHaveBeenCalledWith({
        data: {
          action: 'PAGE_VIEW',
          details: { path: '/dashboard' },
          userId: 'user-1',
        },
      });
      expect(result).toEqual(mockEvent);
    });

    it('should create an event log without userId if not provided', async () => {
      const mockEvent = {
        id: 'test-id-2',
        action: 'EXPORT_USAGE',
        details: { format: 'csv' },
        userId: null,
        createdAt: new Date(),
      };

      ((prisma as any).eventLog.create as any).mockResolvedValue(mockEvent);

      const result = await eventService.logEvent('EXPORT_USAGE', { format: 'csv' });

      expect((prisma as any).eventLog.create).toHaveBeenCalledWith({
        data: {
          action: 'EXPORT_USAGE',
          details: { format: 'csv' },
          userId: undefined,
        },
      });
      expect(result).toEqual(mockEvent);
    });
  });

  describe('getEvents', () => {
    it('should return a list of events and total count', async () => {
      const mockEvents = [
        { id: '1', action: 'LEADERBOARD_CHECK', details: {}, userId: null, createdAt: new Date() },
        { id: '2', action: 'RANK_CHANGE_SEEN', details: {}, userId: 'user-1', createdAt: new Date() }
      ];

      ((prisma as any).eventLog.findMany as any).mockResolvedValue(mockEvents);
      ((prisma as any).eventLog.count as any).mockResolvedValue(2);

      const result = await eventService.getEvents(10, 5);

      expect((prisma as any).eventLog.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 5,
        orderBy: { createdAt: 'desc' },
      });
      expect((prisma as any).eventLog.count).toHaveBeenCalled();
      
      expect(result.events).toEqual(mockEvents);
      expect(result.total).toBe(2);
    });
  });
});
