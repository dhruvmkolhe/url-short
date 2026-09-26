import { Router } from 'express';
import { shorten, getLinks, updateLink, deleteLink, getStats, checkHealth, streamLinkStats } from '../controllers/linkController.js';
import { reportAbuse } from '../controllers/redirectController.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { shortenLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Create short link: Optional Auth (supports guest users), Rate limited
router.post('/shorten', optionalAuth, shortenLimiter, shorten);

// Check destination URL health: Optional Auth
router.post('/health-check', optionalAuth, checkHealth);

// Report abusive link: Optional Auth
router.post('/:code/report', reportAbuse);

// List links: Requires Auth
router.get('/', requireAuth, getLinks);

// Update link configuration: Requires Auth
router.put('/:id', requireAuth, updateLink);

// Delete link: Requires Auth
router.delete('/:id', requireAuth, deleteLink);

// Real-time SSE stream for link analytics
router.get('/:id/stream', optionalAuth, streamLinkStats);

// Get link analytics: Requires Auth
router.get('/:id/stats', requireAuth, getStats);

export default router;
