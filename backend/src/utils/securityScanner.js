import { URL } from 'url';

// ─────────────────────────────────────────────
// 1. DOMAIN BLACKLIST (Known Phishing / IP Loggers)
// ─────────────────────────────────────────────
const DOMAIN_BLACKLIST = new Set([
  'malicious.com', 'phishing.net', 'virus-download.org',
  'grabify.link', 'iplogger.org', 'iplogger.com', '2no.co',
  'blasze.com', 'yip.su', 'ps3cfw.com', 'bmwforum.co',
  'lmgtfy.com', 'ipgrabber.ru', 'iplis.ru', 'trackurl.it'
]);

// ─────────────────────────────────────────────
// 2. FORBIDDEN PROTOCOLS
// ─────────────────────────────────────────────
const FORBIDDEN_PROTOCOLS = new Set([
  'javascript:', 'data:', 'file:', 'vbscript:', 'blob:', 'content:', 'intent:'
]);

// ─────────────────────────────────────────────
// 3. DISPOSABLE EMAIL DOMAINS (100+ providers)
// ─────────────────────────────────────────────
export const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.org',
  'guerrillamail.biz', 'guerrillamail.de', 'guerrillamail.info',
  'tempmail.com', 'temp-mail.org', 'throwam.com', 'throwam.net',
  'sharklasers.com', 'guerrillamailblock.com', 'grr.la', 'guerrillamail.de',
  'spam4.me', 'yopmail.com', 'yopmail.fr', 'cool.fr.nf', 'jetable.fr.nf',
  'nospam.ze.tc', 'nomail.xl.cx', 'mega.zik.dj', 'speed.1s.fr',
  'courriel.fr.nf', 'moncourrier.fr.nf', 'monemail.fr.nf',
  'monmail.fr.nf', 'dispostable.com', 'mailnull.com', 'spamgourmet.com',
  'trashmail.com', 'trashmail.at', 'trashmail.io', 'trashmail.me',
  'trashmail.net', 'trashmail.org', 'trashmailer.com', 'trashmail.xyz',
  'fakeinbox.com', 'mailnesia.com', 'mailnull.com', 'spamevader.com',
  'spamfree24.org', 'spamgob.com', 'spamherelots.com', 'spamhereplease.com',
  'spammotel.com', 'spaml.de', 'spamspot.com', 'spamthisplease.com',
  'spamtroll.net', 'speed.1s.fr', 'superrito.com', 'superstachel.de',
  'suremail.info', 'svk.jp', 'sweetxxx.de', 'tafmail.com', 'tagyourself.com',
  'tempe-mail.com', 'tempinbox.co.uk', 'tempinbox.com', 'tempm.com',
  'tempmail.it', 'tempmaili.com', 'tempomail.fr', 'temporarily.de',
  'temporarioemail.com.br', 'tempsky.com', 'temp-mail.net', 'temp-mail.ru',
  'thanksnospam.info', 'thecloudindex.com', 'thelimestones.com',
  'thisisnotmyrealemail.com', 'thismail.net', 'throwam.com',
  'throwam.net', 'throwaway.email', 'tilien.com', 'tmailinator.com',
  'toiea.com', 'tomisimo.org', 'toomail.biz', 'topranklist.de',
  'tradermail.info', 'trash-mail.at', 'trash-mail.cf', 'trash-mail.com',
  'trash-mail.de', 'trash-mail.ga', 'trash-mail.gq', 'trash-mail.io',
  'trash-mail.ml', 'trash-mail.tk', 'trashdevil.com', 'trashdevil.de',
  'trashmail.at', 'trashmail.com', 'trashmail.de', 'trashmail.io',
  'trashmail.me', 'trashmail.net', 'trashmail.org', 'trashmail.xyz',
  'trashmailer.com', 'trbvm.com', 'trillianpro.com', 'tryalert.com',
  'turual.com', 'twinmail.de', 'tyldd.com', 'uggsrock.com',
  'umail.net', 'uroid.com', 'uteam.site', 'veryrealemail.com',
  'vidchart.com', 'viditag.com', 'vipxm.net', 'vpn.st',
  'vubby.com', 'w3internet.co.uk', 'walala.org', 'watchfull.net',
  'webemail.me', 'weg-werf-email.de', 'wegwerfadresse.de',
  'wegwerfemail.com', 'wegwerfemail.de', 'wegwerfemails.de',
  'wegwerfmail.de', 'wegwerfmail.info', 'wegwerfmail.net',
  'wegwerfmail.org', 'wh4f.org', 'whopy.com', 'wilemail.com',
  'willhackforfood.biz', 'willselfdestruct.com', 'winemaven.info',
  'wronghead.com', 'wuzupmail.net', 'www.e4ward.com',
  'wwwnew.eu', 'xagloo.co', 'xagloo.com', 'xemaps.com',
  'xents.com', 'xmaily.com', 'xoxy.net', 'xsmail.com',
  'yapped.net', 'yeah.net', 'yep.it', 'yogamaven.com',
  'yomail.info', 'yordanmail.cf', 'youmail.ga', 'yourdomain.com',
  'yourewronghereiswhymoron.com', 'yuurok.com', 'z1p.biz',
  'zebins.com', 'zebins.eu', 'zehnminuten.de', 'zetmail.com',
  'zippymail.info', 'zoaxe.com', 'zoemail.net', 'zoemail.org',
  'zomg.info', 'zxcv.com', 'zxcvbnm.com', 'zzz.com',
]);

/**
 * Check if an email belongs to a disposable / temporary email provider.
 */
export function isDisposableEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const domain = email.toLowerCase().split('@')[1];
  if (!domain) return false;
  return DISPOSABLE_EMAIL_DOMAINS.has(domain);
}

/**
 * Validates a target URL against security policies (Anti-Phishing, SSRF, XSS).
 */
export function validateUrlSecurity(urlInput) {
  if (!urlInput || typeof urlInput !== 'string') {
    return { safe: false, error: 'URL must be a valid non-empty string.' };
  }

  const trimmed = urlInput.trim().toLowerCase();

  // 1. Check for dangerous protocols
  for (const forbidden of FORBIDDEN_PROTOCOLS) {
    if (trimmed.startsWith(forbidden)) {
      return { safe: false, error: `Dangerous URL scheme detected (${forbidden}). Only http:// and https:// URLs are allowed.` };
    }
  }

  let parsed;
  try {
    parsed = new URL(urlInput);
  } catch (_) {
    return { safe: false, error: 'Invalid URL structure. Ensure it includes http:// or https://' };
  }

  // 2. Protocol check
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { safe: false, error: 'Only http:// and https:// protocols are permitted for security reasons.' };
  }

  const hostname = parsed.hostname.toLowerCase();

  // 3. Block localhost & internal private IP ranges (Anti-SSRF Protection)
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '::1' ||
    hostname === '169.254.169.254'
  ) {
    return { safe: false, error: 'Shortening local or internal server IP addresses is blocked for security reasons.' };
  }

  // Check IPv4 Private Ranges
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = hostname.match(ipv4Regex);
  if (match) {
    const [, octet1, octet2] = match.map(Number);
    if (
      octet1 === 10 ||
      (octet1 === 172 && octet2 >= 16 && octet2 <= 31) ||
      (octet1 === 192 && octet2 === 168) ||
      octet1 === 127
    ) {
      return { safe: false, error: 'Shortening private internal IP addresses is forbidden.' };
    }
  }

  // 4. Blacklisted Domain Check
  if (DOMAIN_BLACKLIST.has(hostname)) {
    return { safe: false, error: 'This domain is flagged on security blacklists and cannot be shortened.' };
  }

  for (const blacklisted of DOMAIN_BLACKLIST) {
    if (hostname.endsWith('.' + blacklisted)) {
      return { safe: false, error: 'This subdomain belongs to a blacklisted service.' };
    }
  }

  return { safe: true, hostname };
}

/**
 * Check URL against Google Safe Browsing API (v4).
 * Returns { safe: true } if clean, or { safe: false, threats: [...] } if dangerous.
 * Gracefully returns { safe: true } if no API key is configured.
 */
export async function checkGoogleSafeBrowsing(url) {
  const apiKey = process.env.GOOGLE_SAFE_BROWSING_API_KEY;
  if (!apiKey) {
    // No API key configured — skip check (non-blocking)
    return { safe: true, skipped: true };
  }

  try {
    const endpoint = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`;
    const body = {
      client: { clientId: 'common-url-shortener', clientVersion: '1.0.0' },
      threatInfo: {
        threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
        platformTypes: ['ANY_PLATFORM'],
        threatEntryTypes: ['URL'],
        threatEntries: [{ url }]
      }
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(4000) // 4s timeout
    });

    if (!response.ok) {
      console.warn('[SafeBrowsing] API returned non-OK status:', response.status);
      return { safe: true, skipped: true };
    }

    const data = await response.json();

    if (data.matches && data.matches.length > 0) {
      const threatTypes = [...new Set(data.matches.map(m => m.threatType))].join(', ');
      return {
        safe: false,
        threats: data.matches,
        error: `Google Safe Browsing flagged this URL as dangerous: ${threatTypes}. It cannot be shortened.`
      };
    }

    return { safe: true };
  } catch (err) {
    console.warn('[SafeBrowsing] Check failed (non-fatal):', err.message);
    return { safe: true, skipped: true }; // Fail open — don't block if API is down
  }
}
