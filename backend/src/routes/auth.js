import { Router } from 'express';
import { signup, login, getMe, deleteAccount } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Sign Up: Rate-limited, Public
router.post('/signup', authLimiter, signup);

// Log In: Rate-limited, Public
router.post('/login', authLimiter, login);

// Get Me: Strictly authenticated, checks JWT token
router.get('/me', requireAuth, getMe);

// Delete Account: Strictly authenticated
router.delete('/account', requireAuth, deleteAccount);

export default router;
