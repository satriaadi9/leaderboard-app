# AI Agent Express Behavior - Quick Reference

**Project**: Web Application  
**Framework**: Express.js + TypeScript + Prisma  
**Architecture**: Layered (Routes → Middleware → Controllers → Services → Data Access)

## Architecture Pattern

```
Routes (HTTP endpoints)
  ↓
Middleware (Auth, validation)
  ↓
Controllers (Request handling)
  ↓
Services (Business logic)
  ↓
Database (Prisma ORM)
```

## File Structure

```
backend/src/
├── routes/         # API endpoints
├── middleware/     # Auth, validation, error handling
├── controllers/    # Request/response handlers
├── services/       # Business logic
├── validators/     # Zod schemas
├── utils/          # Errors, logger, helpers
└── config/         # DB, Redis, logger config
```

## Controller Pattern

### Responsibilities

- Handle HTTP request/response **ONLY**
- Extract data from request
- Call service methods
- Format response
- **NO business logic**

### Template

```typescript
// controllers/item.controller.ts
import { Request, Response, NextFunction } from 'express';
import { itemService } from '@/services/item.service';
import { AppError } from '@/utils/errors';

export const itemController = {
  async getItemById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const item = await itemService.getItemById(id);

      if (!item) {
        throw new AppError('Item not found', 404);
      }

      res.json({
        success: true,
        data: item,
      });
    } catch (error) {
      next(error);
    }
  },

  async createItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ownerId = req.user!.id;
      const item = await itemService.createItem(ownerId, req.body);

      res.status(201).json({
        success: true,
        data: item,
        message: 'Item created successfully',
      });
    } catch (error) {
      next(error);
    }
  },
};
```

### Controller Rules

**✅ DO:**

- Use try-catch blocks
- Pass errors to `next(error)`
- Return consistent response format: `{ success, data?, message?, errors? }`
- Use correct HTTP status codes (200, 201, 204, 400, 401, 403, 404, 500)
- Document endpoints with JSDoc

**❌ DON'T:**

- Put business logic in controllers
- Access database directly
- Perform validations (use middleware)
- Handle errors without `next()`
- Return inconsistent formats

## Service Pattern

### Responsibilities

- Implement **ALL business logic**
- Validate business rules
- Database operations
- Caching (Redis)
- **NO HTTP concerns**

### Template

```typescript
// services/item.service.ts
import { prisma } from '@/config/database';
import { redis } from '@/config/redis';
import { AppError } from '@/utils/errors';
import { logger } from '@/utils/logger';

export const itemService = {
  async getItemById(itemId: string) {
    const cacheKey = `item:${itemId}`;

    // Check cache
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    // Fetch from DB
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: {
        details: { orderBy: { order: 'asc' } },
        owner: { select: { id: true, name: true } },
      },
    });

    // Cache result
    if (item) {
      await redis.setex(cacheKey, 3600, JSON.stringify(item));
    }

    return item;
  },

  async createItem(ownerId: string, data: CreateItemData) {
    // Validate business rules
    this.validateItemData(data);

    // Use transaction for atomic operations
    const item = await prisma.$transaction(async tx => {
      return await tx.item.create({
        data: {
          title: data.title,
          description: data.description,
          status: data.status,
          ownerId,
          details: {
            create: data.details.map((d, index) => ({
              ...d,
              order: index,
            })),
          },
        },
        include: { details: true },
      });
    });

    logger.info(`Item created: ${item.id} by user: ${ownerId}`);
    return item;
  },

  async updateItem(itemId: string, ownerId: string, updates: UpdateItemData) {
    // Check ownership
    const item = await prisma.item.findUnique({ where: { id: itemId } });

    if (!item) {
      throw new AppError('Item not found', 404);
    }

    if (item.ownerId !== ownerId) {
      throw new AppError('Unauthorized to update this item', 403);
    }

    // Business rule: no updates during active tasks
    const activeTasks = await prisma.task.count({
      where: { itemId, status: 'IN_PROGRESS' },
    });

    if (activeTasks > 0) {
      throw new AppError('Cannot update item with active tasks', 400);
    }

    // Update and invalidate cache
    const updated = await prisma.item.update({
      where: { id: itemId },
      data: updates,
      include: { details: true },
    });

    await redis.del(`item:${itemId}`);
    return updated;
  },

  validateItemData(data: CreateItemData): void {
    if (!data.title?.trim()) {
      throw new AppError('Item title is required', 400);
    }

    if (!data.details?.length) {
      throw new AppError('Item must have at least one detail', 400);
    }

    data.details.forEach((d, i) => {
      if (!d.content?.trim()) {
        throw new AppError(`Detail ${i + 1} is empty`, 400);
      }
    });
  },
};
```

### Service Rules

**✅ DO:**

- Implement all business logic
- Use transactions for multi-step operations
- Validate business rules
- Use caching for read-heavy data
- Log important operations
- Throw `AppError` with proper status codes

**❌ DON'T:**

- Access `req`/`res` objects
- Return HTTP status codes
- Handle HTTP concerns
- Skip error handling

## Middleware Pattern

### Authentication Middleware

```typescript
// middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '@/utils/errors';

interface JwtPayload {
  id: string;
  email: string;
  role: 'ADMIN' | 'USER';
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401);
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Invalid token', 401));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AppError('Token expired', 401));
    } else {
      next(error);
    }
  }
};

export const authorize = (...roles: ('ADMIN' | 'USER')[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403));
    }

    next();
  };
};
```

### Validation Middleware

```typescript
// middleware/validate.ts
import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { AppError } from '@/utils/errors';

export const validate = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        next(new AppError('Validation failed', 400, errors));
      } else {
        next(error);
      }
    }
  };
};
```

### Error Handler Middleware

```typescript
// middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from '@/utils/errors';
import { logger } from '@/utils/logger';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  // Log error
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    user: req.user?.id,
  });

  // Handle AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
    });
    return;
  }

  // Handle Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    res.status(400).json({
      success: false,
      message: 'Database operation failed',
    });
    return;
  }

  // Unknown errors
  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
};
```

## Routes Pattern

```typescript
// routes/item.routes.ts
import { Router } from 'express';
import { itemController } from '@/controllers/item.controller';
import { authenticate, authorize } from '@/middleware/auth';
import { validate } from '@/middleware/validate';
import { createItemSchema, updateItemSchema } from '@/validators/item.validator';

const router = Router();

// Admin routes
router.get('/admin/items', authenticate, authorize('ADMIN'), itemController.getAdminItems);

router.post(
  '/admin/items',
  authenticate,
  authorize('ADMIN'),
  validate(createItemSchema),
  itemController.createItem
);

router.put(
  '/admin/items/:id',
  authenticate,
  authorize('ADMIN'),
  validate(updateItemSchema),
  itemController.updateItem
);

// User routes
router.get('/user/items', authenticate, authorize('USER'), itemController.getUserItems);

export default router;
```

## Validation Pattern

```typescript
// validators/item.validator.ts
import { z } from 'zod';

export const createItemSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(1000).optional(),
    priority: z.number().int().min(1).max(10),
    details: z
      .array(
        z.object({
          content: z.string().min(1),
          type: z.string(),
          order: z.number().int().min(0),
        })
      )
      .min(1)
      .max(100),
  }),
});

export const updateItemSchema = z.object({
  params: z.object({
    id: z.string().cuid(),
  }),
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).optional(),
    priority: z.number().int().min(1).max(10).optional(),
    isActive: z.boolean().optional(),
  }),
});
```

## Database Patterns

### Use Transactions

```typescript
// ✅ Use transactions for multi-step operations
await prisma.$transaction(async tx => {
  const item = await tx.item.create({ data: itemData });
  const tasks = await tx.task.createMany({ data: taskData });
  return { item, tasks };
});
```

### Use Includes for Relations

```typescript
// ✅ Load related data efficiently
const item = await prisma.item.findUnique({
  where: { id },
  include: {
    details: { orderBy: { order: 'asc' } },
    owner: { select: { id: true, name: true } },
  },
});
```

### Use Select for Specific Fields

```typescript
// ✅ Reduce payload size
const items = await prisma.item.findMany({
  select: {
    id: true,
    title: true,
    priority: true,
    _count: { select: { tasks: true } },
  },
});
```

## Security Patterns

```typescript
// app.ts
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';

// Security headers
app.use(helmet());

// CORS
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100, // 100 requests per IP
});
app.use('/api/', limiter);

// Strict limit for auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
});
app.use('/api/auth/login', authLimiter);
```

## Response Format

**Always use consistent format:**

```typescript
// Success (200, 201)
{
  success: true,
  data: { ... },
  message?: "Optional message"
}

// Error (400, 401, 403, 404, 500)
{
  success: false,
  message: "Error message",
  errors?: [ ... ] // Optional validation errors
}
```

## HTTP Status Codes

| Code | Usage                                |
| ---- | ------------------------------------ |
| 200  | Success (GET, PUT, DELETE)           |
| 201  | Created (POST)                       |
| 204  | No Content (DELETE with no response) |
| 400  | Bad Request (validation errors)      |
| 401  | Unauthorized (no/invalid token)      |
| 403  | Forbidden (insufficient permissions) |
| 404  | Not Found                            |
| 500  | Internal Server Error                |

## Critical Rules

1. **Separation**: Controllers handle HTTP, services handle business logic
2. **Errors**: Always use custom `AppError` classes with status codes
3. **Validation**: Use Zod schemas in middleware, NOT in controllers
4. **Transactions**: Use for multi-step DB operations
5. **Caching**: Cache read-heavy data with Redis
6. **Logging**: Log all important operations and errors
7. **Security**: Always authenticate/authorize, validate input, rate limit
8. **Consistency**: Use standard response format everywhere

## Quick Decision Tree

**Need to handle HTTP request?**
→ Create controller method (thin, calls service)

**Need business logic?**
→ Create service method (thick, all logic here)

**Need to validate input?**
→ Create Zod schema in `validators/`, use `validate()` middleware

**Need to check auth?**
→ Use `authenticate` + `authorize('TEACHER')` middleware

**Need multi-step DB operation?**
→ Use `prisma.$transaction()`

**Need to cache data?**
→ Check Redis first, then DB, then cache result

**Need to throw error?**
→ Use `AppError` with proper status code (400, 401, 403, 404)

## Summary

**Express architecture:**

- Routes → Middleware → Controllers → Services → Database
- Controllers: thin, HTTP only
- Services: thick, all business logic
- Middleware: auth, validation, error handling
- Always use transactions, caching, proper errors

**Every endpoint should follow this exact pattern.**
