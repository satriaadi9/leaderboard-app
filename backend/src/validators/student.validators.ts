import { z } from 'zod';

export const getStudentProgressSchema = z.object({
  params: z.object({
    id: z.string().cuid(),
  }),
});
