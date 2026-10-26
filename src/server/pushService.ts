import webpush from 'web-push';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { pushSubscriptionSchema } from './validation';

export type PushSubscriptionPayload = z.infer<typeof pushSubscriptionSchema>;

export interface StoredSubscription {
  subscription: webpush.PushSubscription;
  timezone: string;
  createdAt: number;
}

const STORAGE_FILE = path.resolve(process.cwd(), 'push_subscriptions.json');

// In-memory subscription store (indexed by endpoint URL)
const subscriptionsMap = new Map<string, StoredSubscription>();

// Load persisted subscriptions from disk if available
function loadSubscriptionsFromDisk(): void {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const data = fs.readFileSync(STORAGE_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item?.subscription?.endpoint) {
            subscriptionsMap.set(item.subscription.endpoint, item);
          }
        }
      }
    }
  } catch (err: any) {
    console.warn('Warning: Could not read push subscriptions file, starting fresh:', err?.message);
  }
}

// Persist subscriptions to disk (Note: will reset if the cloud environment is redeployed without persistent volume)
function persistSubscriptionsToDisk(): void {
  try {
    const list = Array.from(subscriptionsMap.values());
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err: any) {
    console.warn('Warning: Could not save push subscriptions to disk:', err?.message);
  }
}

// Initial load
loadSubscriptionsFromDisk();

// Configure VAPID keys if provided in environment
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@digai.local';

let vapidConfigured = false;
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    vapidConfigured = true;
  } catch (err: any) {
    console.warn('VAPID setup warning (push notifications disabled until valid keys provided):', err?.message);
  }
}

export function saveSubscription(payload: PushSubscriptionPayload): { success: boolean; count: number } {
  const sub: webpush.PushSubscription = {
    endpoint: payload.endpoint,
    keys: {
      p256dh: payload.keys.p256dh,
      auth: payload.keys.auth,
    },
  };

  subscriptionsMap.set(payload.endpoint, {
    subscription: sub,
    timezone: payload.timezone || 'Asia/Kolkata',
    createdAt: Date.now(),
  });

  persistSubscriptionsToDisk();

  return { success: true, count: subscriptionsMap.size };
}

export function removeSubscription(endpoint: string): { success: boolean; remaining: number } {
  const deleted = subscriptionsMap.delete(endpoint);
  if (deleted) {
    persistSubscriptionsToDisk();
  }
  return { success: deleted, remaining: subscriptionsMap.size };
}

export function getSubscriptionCount(): number {
  return subscriptionsMap.size;
}

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}

/**
 * Dispatches web push notification to all matching subscriptions (Rule 15 & 19).
 * Drops subscriptions returning 404 or 410.
 */
export async function sendDailyBroadcast(
  title = '⚡ DigAI Morning Intel (7:00 AM)',
  body = 'Today\'s top AI model drops and verified free courses are ready.',
  targetTimezone?: string
): Promise<{ sent: number; failed: number }> {
  if (!vapidConfigured) {
    console.warn('VAPID keys not configured; skipped web-push send.');
    return { sent: 0, failed: 0 };
  }

  const payload = JSON.stringify({
    title,
    body,
    url: '/',
    timestamp: Date.now(),
  });

  let sent = 0;
  let failed = 0;
  let dirty = false;

  for (const [endpoint, record] of Array.from(subscriptionsMap.entries())) {
    if (targetTimezone && record.timezone !== targetTimezone) {
      continue;
    }

    try {
      await webpush.sendNotification(record.subscription, payload);
      sent++;
    } catch (err: any) {
      failed++;
      // Clean up 410 Gone / 404 expired subscriptions
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        subscriptionsMap.delete(endpoint);
        dirty = true;
      }
    }
  }

  if (dirty) {
    persistSubscriptionsToDisk();
  }

  return { sent, failed };
}
