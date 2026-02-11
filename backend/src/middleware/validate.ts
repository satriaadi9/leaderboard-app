import { Request, Response, NextFunction } from 'express';
import { AnyZodObject } from 'zod';

export const validate = (schema: AnyZodObject) => (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { body, query, params } = req;
    schema.parse({
      body,
      query,
      params,
    });
    return next();
  } catch (error) {
    return next(error);
  }
};
