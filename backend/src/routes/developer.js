import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  getApiKeys,
  createApiKey,
  deleteApiKey,
  getWebhooks,
  createWebhook,
  deleteWebhook
} from '../controllers/developerController.js';

const router = express.Router();

// Require auth for all developer portal routes
router.use(requireAuth);

// API Keys routes
router.get('/keys', getApiKeys);
router.post('/keys', createApiKey);
router.delete('/keys/:id', deleteApiKey);

// Webhooks routes
router.get('/webhooks', getWebhooks);
router.post('/webhooks', createWebhook);
router.delete('/webhooks/:id', deleteWebhook);

export default router;
