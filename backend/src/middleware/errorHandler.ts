import { Request, Response, NextFunction } from 'express';
import { AppError } from '@/utils/errors';
import { ZodError } from 'zod';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    console.error(`AppError: ${err.message} (Status: ${err.statusCode})`);
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  if (err instanceof ZodError) {
    console.error('Validation Error:', JSON.stringify(err.errors, null, 2));
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: err.errors,
    });
  }

  console.error('Unhandled Error:', err);
  return res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
};
