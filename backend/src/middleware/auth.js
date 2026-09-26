import jwt from 'jsonwebtoken';
import { prisma } from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'glassmorphic-cyber-secret-key-987654321';

/**
 * Strict authentication middleware.
 * Supports JWT Bearer token OR X-API-Key header.
 */
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const apiKeyHeader = req.headers['x-api-key'] || req.headers['x-api-key'.toLowerCase()];

  // 1. Check API Key Header
  if (apiKeyHeader) {
    try {
      const apiKeyRecord = await prisma.apiKey.findUnique({
        where: { key: apiKeyHeader.trim() },
        include: { user: true }
      });
      if (apiKeyRecord && apiKeyRecord.user) {
        req.user = { id: apiKeyRecord.userId, email: apiKeyRecord.user.email };
        return next();
      }
    } catch (err) {
      console.error('API Key auth error:', err.message);
    }
  }

  // 2. Check JWT Bearer Header
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = { id: decoded.id, email: decoded.email };
      return next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }
  }

  return res.status(401).json({ error: 'Access denied. Valid JWT token or X-API-Key header required.' });
}

/**
 * Optional authentication middleware.
 * Attaches user to request if JWT or X-API-Key is valid.
 */
export async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const apiKeyHeader = req.headers['x-api-key'] || req.headers['x-api-key'.toLowerCase()];

  if (apiKeyHeader) {
    try {
      const apiKeyRecord = await prisma.apiKey.findUnique({
        where: { key: apiKeyHeader.trim() },
        include: { user: true }
      });
      if (apiKeyRecord && apiKeyRecord.user) {
        req.user = { id: apiKeyRecord.userId, email: apiKeyRecord.user.email };
        return next();
      }
    } catch (_) {}
  }

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = { id: decoded.id, email: decoded.email };
    } catch (_) {}
  }

  next();
}
