import { Router } from 'express';
import { eventController } from '@/controllers/event.controller';
import { authenticate, requireSuperAdmin } from '@/middleware/auth';

const router = Router();

// Allow authenticated users to optionally attach their token, but also allow public requests?
// If it needs to be optionally authenticated, we might need a mild middleware. 
// Just using a standard route for POST without failure if no token is fine, or we can make a permissive auth middleware.
// For now, let's keep the logging public, but the controller checks `req.user` if we add an optional auth middleware.

// Make POST open to capture anonymous views as well
router.post('/', (req, res, next) => {
  // Optional auth
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    authenticate(req, res, () => {
      eventController.logEvent(req, res, next);
    });
  } else {
    eventController.logEvent(req, res, next);
  }
});

// Admin endpoint 
router.get('/', authenticate, requireSuperAdmin, eventController.getEvents);

export { router as eventRoutes };
