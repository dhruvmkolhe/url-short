import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';
import { redisClient, isConnected as isRedisConnected } from '../config/redis.js';
import { generateShortCode, isValidAlias } from '../utils/base62.js';
import { getUrlMetadata } from '../utils/metadata.js';
import { analyticsEvents } from './redirectController.js';
import { validateUrlSecurity, checkGoogleSafeBrowsing } from '../utils/securityScanner.js';

/**
 * Shortens a URL (single link).
 */
export async function shorten(req, res) {
  const { longUrl, customAlias, expiresAt, password, maxClicks, redirectType, customDomain, requirePreview, ipAllowlist, ipBlocklist } = req.body;
  const userId = req.user ? req.user.id : null;

  if (!longUrl) {
    return res.status(400).json({ error: 'Original URL (longUrl) is required.' });
  }

  // Layer 1: Deep Security Scan — Protocol, SSRF, Blacklist
  const securityCheck = validateUrlSecurity(longUrl);
  if (!securityCheck.safe) {
    return res.status(400).json({ error: securityCheck.error });
  }

  // Layer 2: Google Safe Browsing (async, fails open if key not set)
  const safeBrowsing = await checkGoogleSafeBrowsing(longUrl);
  if (!safeBrowsing.safe) {
    return res.status(400).json({ error: safeBrowsing.error });
  }

  let code = customAlias ? customAlias.trim() : '';

  // Handle Custom Alias Validation
  if (code) {
    if (!isValidAlias(code)) {
      return res.status(400).json({ 
        error: 'Custom alias must be between 3 and 30 characters and only contain letters, numbers, hyphens, or underscores.' 
      });
    }

    // Check if code is already taken
    const existing = await prisma.link.findUnique({ where: { code } });
    if (existing) {
      return res.status(400).json({ error: 'This custom alias is already in use. Please try another.' });
    }
  } else {
    // Generate an automatic collision-free short code
    let attempts = 0;
    while (attempts < 5) {
      const generated = generateShortCode(6);
      const existing = await prisma.link.findUnique({ where: { code: generated } });
      if (!existing) {
        code = generated;
        break;
      }
      attempts++;
    }

    if (!code) {
      return res.status(500).json({ error: 'Failed to generate a unique short link. Please try again.' });
    }
  }

  // Handle expiration validation
  let expirationDate = null;
  if (expiresAt) {
    expirationDate = new Date(expiresAt);
    if (isNaN(expirationDate.getTime())) {
      return res.status(400).json({ error: 'Invalid expiration date format.' });
    }
    if (expirationDate <= new Date()) {
      return res.status(400).json({ error: 'Expiration date must be in the future.' });
    }
  }

  // Handle link password hashing
  let passwordHash = null;
  if (password && password.trim() !== '') {
    const salt = await bcrypt.genSalt(10);
    passwordHash = await bcrypt.hash(password, salt);
  }

  const parsedMaxClicks = maxClicks ? parseInt(maxClicks, 10) : null;
  const validRedirectType = (redirectType === '301' || redirectType === '302') ? redirectType : '302';

  try {
    // Crawl metadata for previews
    const metadata = await getUrlMetadata(longUrl);

    // Save to Database
    const link = await prisma.link.create({
      data: {
        code,
        longUrl,
        passwordHash,
        expiresAt: expirationDate,
        maxClicks: parsedMaxClicks && !isNaN(parsedMaxClicks) ? parsedMaxClicks : null,
        redirectType: validRedirectType,
        customDomain: customDomain ? customDomain.trim() : null,
        requirePreview: !!requirePreview,
        ipAllowlist: ipAllowlist ? ipAllowlist.trim() : null,
        ipBlocklist: ipBlocklist ? ipBlocklist.trim() : null,
        userId
      }
    });

    const defaultHost = process.env.BASE_URL || 'http://localhost:5000';
    const hostPrefix = link.customDomain ? `https://${link.customDomain}` : defaultHost;
    
    const responsePayload = {
      id: link.id,
      code: link.code,
      longUrl: link.longUrl,
      shortUrl: `${hostPrefix}/${link.code}`,
      expiresAt: link.expiresAt,
      maxClicks: link.maxClicks,
      redirectType: link.redirectType,
      customDomain: link.customDomain,
      requirePreview: link.requirePreview,
      isEnabled: link.isEnabled,
      passwordProtected: !!link.passwordHash,
      createdAt: link.createdAt,
      metadata
    };

    return res.status(201).json(responsePayload);
  } catch (err) {
    console.error('Shorten error:', err);
    return res.status(500).json({ error: 'Internal server error while saving short link.' });
  }
}

/**
 * List the links belonging to the authenticated user.
 * Supports searching by longUrl or code, and filtering by active status.
 */
export async function getLinks(req, res) {
  const userId = req.user.id;
  const { search, filter } = req.query;

  try {
    // Construct database filter query
    const whereClause = { userId };

    if (search) {
      whereClause.OR = [
        { longUrl: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (filter === 'active') {
      whereClause.isEnabled = true;
      whereClause.OR = [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } }
      ];
    } else if (filter === 'disabled') {
      whereClause.isEnabled = false;
    } else if (filter === 'expired') {
      whereClause.expiresAt = { lt: new Date() };
    }

    const links = await prisma.link.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { analytics: true }
        }
      }
    });

    const defaultHost = process.env.BASE_URL || 'http://localhost:5000';
    const formattedLinks = links.map(link => {
      const hostPrefix = link.customDomain ? `https://${link.customDomain}` : defaultHost;
      return {
        id: link.id,
        code: link.code,
        longUrl: link.longUrl,
        shortUrl: `${hostPrefix}/${link.code}`,
        expiresAt: link.expiresAt,
        maxClicks: link.maxClicks,
        redirectType: link.redirectType,
        customDomain: link.customDomain,
        requirePreview: link.requirePreview,
        isFlagged: link.isFlagged,
        reportCount: link.reportCount,
        isEnabled: link.isEnabled,
        passwordProtected: !!link.passwordHash,
        ipAllowlist: link.ipAllowlist || null,
        ipBlocklist: link.ipBlocklist || null,
        createdAt: link.createdAt,
        clicks: link._count.analytics
      };
    });

    return res.json({ links: formattedLinks });
  } catch (err) {
    console.error('GetLinks error:', err);
    return res.status(500).json({ error: 'Internal server error fetching your links.' });
  }
}

/**
 * Update link configurations (long URL, expiresAt, maxClicks, redirectType, customDomain, requirePreview, password, active toggle).
 * Invalidates the Redis Cache to apply updates instantly.
 */
export async function updateLink(req, res) {
  const userId = req.user.id;
  const { id } = req.params;
  const { longUrl, expiresAt, maxClicks, redirectType, customDomain, requirePreview, isEnabled, password, ipAllowlist, ipBlocklist } = req.body;

  try {
    const existingLink = await prisma.link.findFirst({
      where: { id, userId }
    });

    if (!existingLink) {
      return res.status(404).json({ error: 'Short link not found or unauthorized.' });
    }

    const updateData = {};

    if (longUrl !== undefined) {
      if (!isValidUrl(longUrl)) {
        return res.status(400).json({ error: 'Invalid URL format.' });
      }
      updateData.longUrl = longUrl;
    }

    if (expiresAt !== undefined) {
      if (expiresAt === null) {
        updateData.expiresAt = null;
      } else {
        const expirationDate = new Date(expiresAt);
        if (isNaN(expirationDate.getTime())) {
          return res.status(400).json({ error: 'Invalid expiration date format.' });
        }
        updateData.expiresAt = expirationDate;
      }
    }

    if (maxClicks !== undefined) {
      const parsed = parseInt(maxClicks, 10);
      updateData.maxClicks = (!isNaN(parsed) && parsed > 0) ? parsed : null;
    }

    if (redirectType !== undefined) {
      updateData.redirectType = (redirectType === '301' || redirectType === '302') ? redirectType : '302';
    }

    if (customDomain !== undefined) {
      updateData.customDomain = customDomain ? customDomain.trim() : null;
    }

    if (requirePreview !== undefined) {
      updateData.requirePreview = !!requirePreview;
    }

    if (isEnabled !== undefined) {
      updateData.isEnabled = !!isEnabled;
    }

    if (password !== undefined) {
      if (password === null || password.trim() === '') {
        updateData.passwordHash = null; // Clear password
      } else {
        const salt = await bcrypt.genSalt(10);
        updateData.passwordHash = await bcrypt.hash(password, salt);
      }
    }

    // IP Allowlist / Blocklist
    if (ipAllowlist !== undefined) {
      updateData.ipAllowlist = ipAllowlist ? ipAllowlist.trim() : null;
    }
    if (ipBlocklist !== undefined) {
      updateData.ipBlocklist = ipBlocklist ? ipBlocklist.trim() : null;
    }

    const updated = await prisma.link.update({
      where: { id },
      data: updateData
    });

    // Invalidate Redis Cache instantly
    if (isRedisConnected) {
      await redisClient.del(`link:${existingLink.code}`);
      console.log(`Cache invalidated for: link:${existingLink.code}`);
    }

    const defaultHost = process.env.BASE_URL || 'http://localhost:5000';
    const hostPrefix = updated.customDomain ? `https://${updated.customDomain}` : defaultHost;
    return res.json({
      message: 'Short link updated successfully.',
      link: {
        id: updated.id,
        code: updated.code,
        longUrl: updated.longUrl,
        shortUrl: `${hostPrefix}/${updated.code}`,
        expiresAt: updated.expiresAt,
        maxClicks: updated.maxClicks,
        redirectType: updated.redirectType,
        customDomain: updated.customDomain,
        requirePreview: updated.requirePreview,
        isEnabled: updated.isEnabled,
        passwordProtected: !!updated.passwordHash,
        updatedAt: updated.updatedAt
      }
    });
  } catch (err) {
    console.error('UpdateLink error:', err);
    return res.status(500).json({ error: 'Internal server error updating link settings.' });
  }
}

/**
 * Delete a link.
 * Invalidates the Redis Cache.
 */
export async function deleteLink(req, res) {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const existingLink = await prisma.link.findFirst({
      where: { id, userId }
    });

    if (!existingLink) {
      return res.status(404).json({ error: 'Short link not found or unauthorized.' });
    }

    await prisma.link.delete({ where: { id } });

    // Invalidate Redis cache
    if (isRedisConnected) {
      await redisClient.del(`link:${existingLink.code}`);
      console.log(`Cache deleted for: link:${existingLink.code}`);
    }

    return res.json({ message: 'Short link deleted successfully.' });
  } catch (err) {
    console.error('DeleteLink error:', err);
    return res.status(500).json({ error: 'Internal server error deleting link.' });
  }
}

/**
 * Compile detailed click analytics for a specific link.
 */
export async function getStats(req, res) {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const link = await prisma.link.findFirst({
      where: { id, userId }
    });

    if (!link) {
      return res.status(404).json({ error: 'Short link not found or unauthorized.' });
    }

    const analytics = await prisma.analytic.findMany({
      where: { linkId: id },
      orderBy: { clickedAt: 'asc' }
    });

    // Aggregate click telemetry
    const totalClicks = analytics.length;
    const uniqueClicks = new Set(analytics.map(click => click.ip)).size;
    const clicksOverTime = {};
    const devices = { Desktop: 0, Mobile: 0, Tablet: 0 };
    const browsers = {};
    const countries = {};
    const cities = {};
    const referrers = {};

    analytics.forEach(click => {
      // 1. Clicks Over Time (YYYY-MM-DD)
      const dateStr = new Date(click.clickedAt).toISOString().split('T')[0];
      clicksOverTime[dateStr] = (clicksOverTime[dateStr] || 0) + 1;

      // 2. Devices
      const dev = click.device;
      if (devices[dev] !== undefined) {
        devices[dev]++;
      } else {
        devices.Desktop++; // Safeguard fallback
      }

      // 3. Browsers
      const browser = click.browser;
      browsers[browser] = (browsers[browser] || 0) + 1;

      // 4. Countries
      const country = click.country;
      countries[country] = (countries[country] || 0) + 1;

      // 5. Cities
      const city = click.city;
      cities[city] = (cities[city] || 0) + 1;

      // 6. Referrers
      const ref = click.referrer;
      referrers[ref] = (referrers[ref] || 0) + 1;
    });

    // Format clicksOverTime into sorted chart friendly arrays
    const formattedTimeline = Object.keys(clicksOverTime).map(date => ({
      date,
      clicks: clicksOverTime[date]
    }));

    return res.json({
      code: link.code,
      longUrl: link.longUrl,
      totalClicks,
      uniqueClicks,
      analytics: {
        clicksOverTime: formattedTimeline,
        devices,
        browsers: Object.entries(browsers).map(([name, value]) => ({ name, value })),
        countries: Object.entries(countries).map(([name, value]) => ({ name, value })),
        cities: Object.entries(cities).map(([name, value]) => ({ name, value })),
        referrers: Object.entries(referrers).map(([name, value]) => ({ name, value }))
      }
    });
  } catch (err) {
    console.error('GetStats error:', err);
    return res.status(500).json({ error: 'Internal server error compiling analytics.' });
  }
}

/**
 * Tests if a target longUrl is live and reachable (returns HTTP 200 OK, 30x redirect, or 404 broken).
 */
export async function checkHealth(req, res) {
  const { url } = req.body;

  if (!url || !isValidUrl(url)) {
    return res.status(400).json({ error: 'Valid URL is required for health check.' });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    let response;
    try {
      response = await fetch(url, {
        method: 'HEAD',
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) CommonUrlShortener/1.0' },
        signal: controller.signal
      });
    } catch (_) {
      // Fallback to GET if HEAD method fails
      response = await fetch(url, {
        method: 'GET',
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) CommonUrlShortener/1.0' },
        signal: controller.signal
      });
    }

    clearTimeout(timeoutId);

    const status = response.status;
    const ok = response.ok;

    return res.json({
      url,
      status,
      ok,
      healthy: status >= 200 && status < 400,
      statusText: response.statusText || (ok ? 'OK' : 'Error')
    });
  } catch (err) {
    const isTimeout = err.name === 'AbortError';
    return res.json({
      url,
      status: isTimeout ? 408 : 500,
      ok: false,
      healthy: false,
      statusText: isTimeout ? 'Request Timed Out (5s)' : 'Connection Failed'
    });
  }
}

/**
 * Streams real-time analytics events (SSE) for a specific link or user links.
 */
export async function streamLinkStats(req, res) {
  const { id } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: 'connected', linkId: id, timestamp: new Date() })}\n\n`);

  const onAnalyticsClick = (data) => {
    if (!id || id === 'all' || data.linkId === id) {
      try {
        res.write(`data: ${JSON.stringify({ type: 'click', ...data })}\n\n`);
      } catch (_) {}
    }
  };

  analyticsEvents.on('click', onAnalyticsClick);

  // Send periodic heartbeat every 15 seconds to keep connection alive
  const heartbeatTimer = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch (_) {}
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeatTimer);
    analyticsEvents.removeListener('click', onAnalyticsClick);
    res.end();
  });
}
