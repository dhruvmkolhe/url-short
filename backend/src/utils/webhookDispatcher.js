import { prisma } from '../config/db.js';

/**
 * Asynchronously dispatches event webhooks to registered user endpoints.
 * Non-blocking operation so API responses stay sub-100ms.
 */
export async function dispatchWebhook(userId, event, payload) {
  if (!userId) return;

  try {
    const webhooks = await prisma.webhook.findMany({
      where: {
        userId,
        isEnabled: true
      }
    });

    if (webhooks.length === 0) return;

    webhooks.forEach(async (wh) => {
      // Check if webhook is subscribed to this event
      const subscribedEvents = wh.events.split(',').map(e => e.trim());
      if (!subscribedEvents.includes(event) && !subscribedEvents.includes('*')) {
        return;
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

        await fetch(wh.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shortener-Event': event,
            'User-Agent': 'CommonUrlShortener-Webhook/1.0'
          },
          body: JSON.stringify({
            event,
            timestamp: new Date().toISOString(),
            data: payload
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        console.log(`[Webhook] Dispatched ${event} to ${wh.url}`);
      } catch (err) {
        console.warn(`[Webhook] Failed dispatching ${event} to ${wh.url}:`, err.message);
      }
    });
  } catch (err) {
    console.error('[Webhook Dispatcher Error]:', err.message);
  }
}
