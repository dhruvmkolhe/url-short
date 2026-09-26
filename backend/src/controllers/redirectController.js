import EventEmitter from 'events';
import geoip from 'geoip-lite';
import UAParser from 'ua-parser-js';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';
import { redisClient, isConnected as isRedisConnected } from '../config/redis.js';
import { dispatchWebhook } from '../utils/webhookDispatcher.js';

export const analyticsEvents = new EventEmitter();

// ─────────────────────────────────────────────
// Bot / Headless Browser Detection
// ─────────────────────────────────────────────
const BOT_UA_PATTERNS = [
  /bot/i, /crawl/i, /spider/i, /slurp/i, /facebookexternalhit/i,
  /twitterbot/i, /linkedinbot/i, /whatsapp/i, /telegrambot/i,
  /discordbot/i, /slackbot/i, /headlesschrome/i, /phantomjs/i,
  /puppeteer/i, /playwright/i, /selenium/i, /webdriver/i,
  /scrapy/i, /python-requests/i, /curl\//i, /wget\//i,
  /httpie/i, /go-http-client/i, /java\//i, /okhttp/i,
  /axios/i, /node-fetch/i, /got\//i, /superagent/i,
  /prerender/i, /googlebot/i, /bingbot/i, /yandexbot/i,
  /duckduckbot/i, /baiduspider/i, /applebot/i, /msnbot/i
];

/**
 * Returns true if the User-Agent string indicates a bot, scraper, or headless browser.
 */
function isBot(userAgent) {
  if (!userAgent || userAgent.trim() === '') return true; // No UA = bot
  return BOT_UA_PATTERNS.some(pattern => pattern.test(userAgent));
}

// Realistic geo list for local development mocking
const MOCK_LOCATIONS = [
  { country: 'United States', city: 'San Francisco' },
  { country: 'United Kingdom', city: 'London' },
  { country: 'Germany', city: 'Berlin' },
  { country: 'Japan', city: 'Tokyo' },
  { country: 'Canada', city: 'Toronto' },
  { country: 'Australia', city: 'Sydney' },
  { country: 'India', city: 'Mumbai' },
  { country: 'France', city: 'Paris' }
];

/**
 * Normalizes Referrer to human readable names.
 */
function parseReferrer(refHeader) {
  if (!refHeader) return 'Direct';
  try {
    const url = new URL(refHeader);
    const host = url.hostname.toLowerCase();
    
    if (host.includes('t.co') || host.includes('twitter.com') || host.includes('x.com')) return 'Twitter / X';
    if (host.includes('linkedin.com')) return 'LinkedIn';
    if (host.includes('facebook.com') || host.includes('fb.me')) return 'Facebook';
    if (host.includes('instagram.com')) return 'Instagram';
    if (host.includes('google.com')) return 'Google Search';
    if (host.includes('github.com')) return 'GitHub';
    if (host.includes('youtube.com')) return 'YouTube';
    if (host.includes('reddit.com')) return 'Reddit';
    
    return url.hostname;
  } catch (_) {
    return 'Referral';
  }
}

/**
 * Asynchronously logs click analytics in the background and dispatches webhooks.
 */
async function captureAnalytic(linkId, req) {
  try {
    const userAgent = req.headers['user-agent'] || '';
    const referrerHeader = req.headers['referer'] || req.headers['referrer'] || '';
    
    // Parse IP
    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    if (ip.includes(',')) {
      ip = ip.split(',')[0].trim();
    }
    if (ip.startsWith('::ffff:')) {
      ip = ip.substring(7);
    }

    const ua = new UAParser(userAgent).getResult();
    const browserName = ua.browser.name || 'Unknown';
    const osName = ua.os.name || 'Unknown';
    
    let deviceType = 'Desktop';
    if (ua.device.type === 'mobile') {
      deviceType = 'Mobile';
    } else if (ua.device.type === 'tablet') {
      deviceType = 'Tablet';
    }

    let country = 'Unknown';
    let city = 'Unknown';
    
    const geo = geoip.lookup(ip);
    if (geo) {
      country = geo.country || 'Unknown';
      city = geo.city || 'Unknown';
      if (country === 'US') country = 'United States';
      else if (country === 'GB') country = 'United Kingdom';
      else if (country === 'DE') country = 'Germany';
      else if (country === 'JP') country = 'Japan';
      else if (country === 'CA') country = 'Canada';
      else if (country === 'IN') country = 'India';
      else if (country === 'FR') country = 'France';
    } else if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      const mock = MOCK_LOCATIONS[Math.floor(Math.random() * MOCK_LOCATIONS.length)];
      country = mock.country;
      city = mock.city;
    }

    const referrer = parseReferrer(referrerHeader);

    // Save to Database
    const analytic = await prisma.analytic.create({
      data: {
        linkId,
        ip,
        country,
        city,
        browser: browserName,
        os: osName,
        device: deviceType,
        referrer
      }
    });

    // Emit live analytics click event for real-time subscribers
    analyticsEvents.emit('click', { linkId, analytic });

    // Fetch link details to trigger user webhook
    const link = await prisma.link.findUnique({ where: { id: linkId } });
    if (link && link.userId) {
      dispatchWebhook(link.userId, 'link.clicked', {
        id: link.id,
        code: link.code,
        longUrl: link.longUrl,
        ip,
        country,
        city,
        device: deviceType,
        browser: browserName,
        referrer
      });
    }
  } catch (err) {
    console.error('Error logging click analytic:', err.message);
  }
}

/**
 * HTML Template for Password Wall Gate
 */
function getPasswordWallHtml(code, error = '') {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Protected Link - URL Shortener</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet">
      <style>
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
          background: radial-gradient(circle at 50% 30%, #1e293b 0%, #0f172a 100%);
          color: #f8fafc;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
        }
        .container {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 20px;
          padding: 3rem 2.5rem;
          max-width: 460px;
          width: 100%;
          text-align: center;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
        }
        .icon {
          width: 64px;
          height: 64px;
          background: rgba(99, 102, 241, 0.15);
          border: 1px solid rgba(99, 102, 241, 0.4);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.5rem;
          color: #818cf8;
          box-shadow: 0 0 20px rgba(99, 102, 241, 0.2);
        }
        .icon svg {
          width: 30px;
          height: 30px;
        }
        h1 {
          font-size: 1.8rem;
          font-weight: 800;
          color: #ffffff;
          margin-bottom: 0.75rem;
          letter-spacing: -0.02em;
        }
        p {
          color: #cbd5e1;
          font-size: 1rem;
          line-height: 1.6;
          margin-bottom: 2rem;
        }
        form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .input-group {
          position: relative;
        }
        input[type="password"] {
          width: 100%;
          padding: 0.85rem 1.25rem;
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 12px;
          color: #ffffff;
          font-size: 1rem;
          outline: none;
          font-family: inherit;
          transition: all 0.2s ease;
        }
        input[type="password"]:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25);
        }
        button {
          width: 100%;
          padding: 0.85rem 1.5rem;
          background: #6366f1;
          border: none;
          border-radius: 12px;
          color: #ffffff;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.2s ease;
          box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);
        }
        button:hover {
          background: #4f46e5;
          transform: translateY(-1px);
        }
        button:active {
          transform: translateY(0);
        }
        .error-message {
          color: #f87171;
          font-size: 0.875rem;
          font-weight: 600;
          margin-top: -0.5rem;
          text-align: left;
          padding-left: 0.25rem;
        }
        .footer {
          margin-top: 2rem;
          font-size: 0.85rem;
          font-weight: 500;
          color: #94a3b8;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
          </svg>
        </div>
        <h1>Enter Password</h1>
        <p>This link is encrypted and requires a password to grant access.</p>
        <form method="POST" action="/redirect-auth/${code}">
          <div class="input-group">
            <input type="password" name="password" placeholder="Password" required autofocus>
          </div>
          ${error ? `<div class="error-message">${error}</div>` : ''}
          <button type="submit">Unlock & Access</button>
        </form>
        <div class="footer">Securely redirected by Common URL Shortener</div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Standard HTTP Redirection Handler (GET /:code)
 */
export async function handleRedirect(req, res, next) {
  const { code } = req.params;

  // Reserved frontend app routes
  const RESERVED_ROUTES = ['dashboard', 'links', 'developer', 'analytics', 'api-console', 'shorten', 'login', 'signup'];
  if (RESERVED_ROUTES.includes(code.toLowerCase())) {
    return next();
  }

  try {
    let linkData = null;

    // 1. Try fetching from Redis Cache first
    if (isRedisConnected) {
      try {
        const cached = await redisClient.get(`link:${code}`);
        if (cached) {
          linkData = JSON.parse(cached);
          console.debug(`Redis Cache Hit for code: ${code}`);
        }
      } catch (cacheErr) {
        console.warn('Redis read failed. Bypassing to DB:', cacheErr.message);
      }
    }

    // 2. Cache Miss: Fetch from PostgreSQL Database
    if (!linkData) {
      const link = await prisma.link.findUnique({
        where: { code }
      });

      if (!link) {
        if (next && (req.headers['accept']?.includes('text/html') || req.url.startsWith('/analytics/'))) {
          return next();
        }
        return res.status(404).send(getCustomErrorHtml('404: Link Not Found', 'This short code does not exist. Please check your spelling or verify if the owner deleted it.'));
      }

      linkData = {
        id: link.id,
        code: link.code,
        longUrl: link.longUrl,
        passwordHash: link.passwordHash,
        expiresAt: link.expiresAt ? link.expiresAt.toISOString() : null,
        maxClicks: link.maxClicks,
        redirectType: link.redirectType || '302',
        requirePreview: link.requirePreview || false,
        isEnabled: link.isEnabled,
        ipAllowlist: link.ipAllowlist || null,
        ipBlocklist: link.ipBlocklist || null,
      };

      // Store in Redis (TTL: 24 Hours)
      if (isRedisConnected) {
        try {
          await redisClient.setEx(`link:${code}`, 86400, JSON.stringify(linkData));
          console.debug(`Redis Cache Warmed for code: ${code}`);
        } catch (cacheErr) {
          console.warn('Redis write failed:', cacheErr.message);
        }
      }
    }

    // 3. Check Toggle State
    if (!linkData.isEnabled) {
      return res.status(403).send(getCustomErrorHtml('Link Disabled', 'This short link has been temporarily disabled by its creator.'));
    }

    // 4. Check Expiration Date
    if (linkData.expiresAt && new Date(linkData.expiresAt) <= new Date()) {
      return res.status(410).send(getCustomErrorHtml('Link Expired', 'This short link has expired and is no longer available.'));
    }

    // 4b. Check Max Clicks TTL Limit
    if (linkData.maxClicks && linkData.maxClicks > 0) {
      const clickCount = await prisma.analytic.count({ where: { linkId: linkData.id } });
      if (clickCount >= linkData.maxClicks) {
        return res.status(410).send(getCustomErrorHtml('Click Limit Reached', 'This short link has reached its maximum allowed click limit.'));
      }
    }

    // 5. Check Password protection wall
    if (linkData.passwordHash) {
      return res.send(getPasswordWallHtml(code));
    }

    // 6. Check Interstitial Link Preview Gate
    if (linkData.requirePreview && !req.query.skipPreview) {
      return res.send(getPreviewHtml(linkData));
    }

    // 7a. Bot / Headless Browser Detection — skip click count inflation
    const userAgent = req.headers['user-agent'] || '';
    if (isBot(userAgent)) {
      console.debug(`[BotGuard] Bot detected, skipping analytics for code: ${code} UA: ${userAgent.slice(0, 80)}`);
      // Still redirect but do NOT log the click
      const statusCode = parseInt(linkData.redirectType, 10) || 302;
      return res.redirect(statusCode, linkData.longUrl);
    }

    // 7b. IP Allowlist / Blocklist check
    let visitorIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    if (visitorIp.includes(',')) visitorIp = visitorIp.split(',')[0].trim();
    if (visitorIp.startsWith('::ffff:')) visitorIp = visitorIp.substring(7);

    if (linkData.ipBlocklist) {
      const blocked = linkData.ipBlocklist.split(',').map(s => s.trim()).filter(Boolean);
      if (blocked.includes(visitorIp)) {
        return res.status(403).send(getCustomErrorHtml('Access Denied', 'Your IP address has been blocked from accessing this link.'));
      }
    }

    if (linkData.ipAllowlist) {
      const allowed = linkData.ipAllowlist.split(',').map(s => s.trim()).filter(Boolean);
      if (allowed.length > 0 && !allowed.includes(visitorIp)) {
        return res.status(403).send(getCustomErrorHtml('Access Restricted', 'This link is restricted to specific IP addresses. Your IP is not authorized.'));
      }
    }

    // 8. Non-blocking: Capture click analytics in background (real humans only)
    captureAnalytic(linkData.id, req);

    // 9. Perform Redirect (301 Permanent or 302 Temporary)!
    const statusCode = parseInt(linkData.redirectType, 10) || 302;
    return res.redirect(statusCode, linkData.longUrl);
  } catch (err) {
    console.error('Redirection error:', err);
    return res.status(500).send(getCustomErrorHtml('500: Server Error', 'An unexpected error occurred. Please try again.'));
  }
}

/**
 * Endpoint for visitors to report abusive links (POST /api/links/:code/report)
 */
export async function reportAbuse(req, res) {
  const { code } = req.params;

  try {
    const link = await prisma.link.findUnique({ where: { code } });
    if (!link) {
      return res.status(404).json({ error: 'Link not found.' });
    }

    const updatedReportCount = link.reportCount + 1;
    const isFlagged = updatedReportCount >= 3;

    await prisma.link.update({
      where: { id: link.id },
      data: {
        reportCount: updatedReportCount,
        isFlagged,
        isEnabled: isFlagged ? false : link.isEnabled // Auto-disable if flagged
      }
    });

    if (req.headers['accept']?.includes('text/html')) {
      return res.send(getCustomErrorHtml('Report Submitted', 'Thank you. This link has been reported for safety review.'));
    }

    return res.json({ message: 'Abuse report submitted. Thank you for keeping our platform safe.' });
  } catch (err) {
    console.error('Report abuse error:', err);
    return res.status(500).json({ error: 'Failed to submit abuse report.' });
  }
}

/**
 * Handle POST submission for password authentication (POST /redirect-auth/:code)
 */
export async function authenticatePassword(req, res) {
  const { code } = req.params;
  const { password } = req.body;

  if (!password) {
    return res.status(400).send(getPasswordWallHtml(code, 'Password is required.'));
  }

  try {
    // Fetch link details
    let link = null;
    
    // Check Redis
    if (isRedisConnected) {
      const cached = await redisClient.get(`link:${code}`);
      if (cached) link = JSON.parse(cached);
    }
    
    if (!link) {
      link = await prisma.link.findUnique({ where: { code } });
      if (!link) return res.status(404).send(getCustomErrorHtml('Link Not Found', 'This short code does not exist.'));
    }

    // Validate if password gate is still active
    if (!link.passwordHash) {
      return res.redirect(302, link.longUrl);
    }

    // Compare Hash
    const isMatch = await bcrypt.compare(password, link.passwordHash);
    if (!isMatch) {
      return res.status(401).send(getPasswordWallHtml(code, 'Incorrect password. Access denied.'));
    }

    // Pass -> Asynchronously capture click analytics
    captureAnalytic(link.id, req);

    // Redirect to destination
    return res.redirect(302, link.longUrl);
  } catch (err) {
    console.error('Password redirect auth error:', err);
    return res.status(500).send(getPasswordWallHtml(code, 'Internal server error validating password.'));
  }
}

/**
 * HTML Helper for serving gorgeous Custom Error Pages (404, Expired, Disabled)
 */
function getCustomErrorHtml(title, message) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title} - Common Link</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap" rel="stylesheet">
      <style>
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
          background: radial-gradient(circle at 50% 30%, #1e293b 0%, #0f172a 100%);
          color: #f8fafc;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
        }
        .container {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 20px;
          padding: 3rem 2.5rem;
          max-width: 460px;
          width: 100%;
          text-align: center;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
        }
        .icon {
          width: 64px;
          height: 64px;
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.4);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.5rem;
          color: #ef4444;
          box-shadow: 0 0 20px rgba(239, 68, 68, 0.2);
        }
        .icon svg {
          width: 30px;
          height: 30px;
        }
        h1 {
          font-size: 1.8rem;
          font-weight: 800;
          color: #ffffff;
          margin-bottom: 0.75rem;
          letter-spacing: -0.02em;
        }
        p {
          color: #cbd5e1;
          font-size: 1rem;
          line-height: 1.6;
          margin-bottom: 2rem;
        }
        .btn {
          display: inline-block;
          padding: 0.85rem 2rem;
          background: #6366f1;
          border-radius: 12px;
          color: #ffffff;
          font-size: 0.95rem;
          font-weight: 700;
          text-decoration: none;
          transition: all 0.2s ease;
          box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);
        }
        .btn:hover {
          background: #4f46e5;
          transform: translateY(-1px);
        }
        .footer {
          margin-top: 2rem;
          font-size: 0.85rem;
          font-weight: 500;
          color: #94a3b8;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
        </div>
        <h1>${title}</h1>
        <p>${message}</p>
        <a href="/" class="btn">Return to Platform</a>
        <div class="footer">Common Link Security</div>
      </div>
    </body>
    </html>
  `;
}
