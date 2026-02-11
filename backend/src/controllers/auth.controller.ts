import { Request, Response, NextFunction } from 'express';
import { authService } from '@/services/auth.service';

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const data = await authService.login(email, password);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, name, password } = req.body;
    const data = await authService.register(email, name, password);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
