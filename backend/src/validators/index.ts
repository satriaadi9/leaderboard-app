import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    name: z.string().min(1),
    password: z.string().min(6),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6),
  }),
});

export const createClassSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    description: z.string().optional(),
  }),
});

export const updateClassSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    isArchived: z.boolean().optional(),
  }),
});

export const enrollStudentSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z.object({
    studentName: z.string().trim().min(1),
    studentEmail: z.string().trim().email(),
  }),
});

export const importStudentsSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z.array(
    z.object({
      nim: z.string(),
      name: z.string(),
      email: z.string().email().optional(),
    })
  ),
});

export const adjustPointsSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z.object({
    studentId: z.string(),
    delta: z.number().int(),
    reason: z.string().min(1),
  }),
});

export const getLeaderboardSchema = z.object({
  params: z.object({
    idOrSlug: z.string(),
  }),
  query: z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
  }),
});
