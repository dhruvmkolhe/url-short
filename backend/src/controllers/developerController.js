import crypto from 'crypto';
import { prisma } from '../config/db.js';

// ==================== API KEYS CONTROLLERS ====================

/**
 * List API keys belonging to the authenticated user.
 */
export async function getApiKeys(req, res) {
  const userId = req.user.id;
  try {
    const keys = await prisma.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({
      keys: keys.map(k => ({
        id: k.id,
        name: k.name,
        key: k.key, // sk_live_...
        createdAt: k.createdAt
      }))
    });
  } catch (err) {
    console.error('getApiKeys error:', err);
    return res.status(500).json({ error: 'Failed to retrieve API keys.' });
  }
}

/**
 * Generate a new secret API key for the authenticated user.
 */
export async function createApiKey(req, res) {
  const userId = req.user.id;
  const { name } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'API key name/label is required (e.g. "Production Server").' });
  }

  try {
    const randomHex = crypto.randomBytes(24).toString('hex');
    const key = `sk_live_${randomHex}`;

    const apiKey = await prisma.apiKey.create({
      data: {
        name: name.trim(),
        key,
        userId
      }
    });

    return res.status(201).json({
      message: 'API Key generated successfully.',
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        key: apiKey.key,
        createdAt: apiKey.createdAt
      }
    });
  } catch (err) {
    console.error('createApiKey error:', err);
    return res.status(500).json({ error: 'Failed to generate API Key.' });
  }
}

/**
 * Revoke/Delete an API key.
 */
export async function deleteApiKey(req, res) {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const existing = await prisma.apiKey.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'API Key not found or unauthorized.' });
    }

    await prisma.apiKey.delete({ where: { id } });
    return res.json({ message: 'API Key revoked successfully.' });
  } catch (err) {
    console.error('deleteApiKey error:', err);
    return res.status(500).json({ error: 'Failed to revoke API Key.' });
  }
}

// ==================== WEBHOOKS CONTROLLERS ====================

/**
 * List webhooks belonging to the authenticated user.
 */
export async function getWebhooks(req, res) {
  const userId = req.user.id;
  try {
    const webhooks = await prisma.webhook.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ webhooks });
  } catch (err) {
    console.error('getWebhooks error:', err);
    return res.status(500).json({ error: 'Failed to retrieve webhooks.' });
  }
}

/**
 * Create a new event webhook endpoint.
 */
export async function createWebhook(req, res) {
  const userId = req.user.id;
  const { url, events } = req.body;

  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ error: 'Valid HTTP/HTTPS webhook URL is required.' });
  }

  const eventsStr = Array.isArray(events) ? events.join(',') : (events || 'link.clicked,link.updated,link.expired');

  try {
    const secret = `whsec_${crypto.randomBytes(16).toString('hex')}`;
    const webhook = await prisma.webhook.create({
      data: {
        url: url.trim(),
        events: eventsStr,
        secret,
        userId
      }
    });

    return res.status(201).json({
      message: 'Webhook registered successfully.',
      webhook
    });
  } catch (err) {
    console.error('createWebhook error:', err);
    return res.status(500).json({ error: 'Failed to register webhook.' });
  }
}

/**
 * Delete a webhook endpoint.
 */
export async function deleteWebhook(req, res) {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const existing = await prisma.webhook.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Webhook endpoint not found or unauthorized.' });
    }

    await prisma.webhook.delete({ where: { id } });
    return res.json({ message: 'Webhook endpoint deleted.' });
  } catch (err) {
    console.error('deleteWebhook error:', err);
    return res.status(500).json({ error: 'Failed to delete webhook.' });
  }
}
