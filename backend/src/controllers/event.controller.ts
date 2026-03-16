import { Request, Response, NextFunction } from 'express';
import { eventService } from '@/services/event.service';
import { AppError } from '@/utils/errors';

export const eventController = {
  async logEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const { action, details } = req.body;
      if (!action) {
        throw new AppError('Action is required', 400);
      }
      
      const userId = req.user?.userId; // Optional user ID if authenticated
      const event = await eventService.logEvent(action, details, userId);

      res.status(201).json({
        success: true,
        data: event,
        message: 'Event logged successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  async getEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;

      const data = await eventService.getEvents(limit, offset);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
};
