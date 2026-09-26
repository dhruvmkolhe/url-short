/**
 * Lightweight Client Analytics & CTA Event Tracker
 */

const EVENT_LOG_KEY = 'app_analytics_events';

export const trackPageView = (path) => {
  const timestamp = new Date().toISOString();
  const event = {
    type: 'pageview',
    path,
    timestamp,
    userAgent: navigator.userAgent,
    referrer: document.referrer || 'direct'
  };
  
  logEvent(event);
};

export const trackEvent = (eventName, metadata = {}) => {
  const timestamp = new Date().toISOString();
  const event = {
    type: 'event',
    eventName,
    metadata,
    timestamp
  };
  
  logEvent(event);
};

export const track404 = (invalidPath) => {
  trackEvent('404_not_found', { invalidPath });
};

const logEvent = (eventData) => {
  try {
    const existingStr = localStorage.getItem(EVENT_LOG_KEY);
    const existing = existingStr ? JSON.parse(existingStr) : [];
    // Keep last 50 events locally
    const updated = [eventData, ...existing].slice(0, 50);
    localStorage.setItem(EVENT_LOG_KEY, JSON.stringify(updated));
    if (import.meta.env.DEV) {
      console.log('📊 [Analytics Tracked]:', eventData);
    }
  } catch (err) {
    // Silent catch
  }
};
