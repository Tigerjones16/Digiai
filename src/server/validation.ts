import { z } from 'zod';

/**
 * Security Rule 7: SSRF Protection for Web Push Endpoints.
 * The endpoint must be HTTPS and its hostname must belong to the trusted browser push services.
 */
export function isAllowedPushEndpoint(endpointStr: string): boolean {
  if (!endpointStr || endpointStr.length > 500) {
    return false;
  }
  try {
    const parsed = new URL(endpointStr);
    if (parsed.protocol !== 'https:') {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    const isAllowed =
      host === 'fcm.googleapis.com' ||
      host === 'web.push.apple.com' ||
      host.endsWith('.push.apple.com') ||
      host === 'updates.push.services.mozilla.com' ||
      host.endsWith('.notify.windows.com');

    return isAllowed;
  } catch {
    return false;
  }
}

// Rule 4: Validate every input with zod. Reject unknown fields.
export const chatRequestSchema = z
  .object({
    prompt: z
      .string()
      .trim()
      .min(1, 'Prompt cannot be empty')
      .max(2000, 'Prompt cannot exceed 2000 characters'),
  })
  .strict();

export const pushSubscriptionSchema = z
  .object({
    endpoint: z
      .string()
      .url('Invalid endpoint URL')
      .max(500, 'Endpoint exceeds 500 characters')
      .refine(isAllowedPushEndpoint, {
        message: 'Endpoint host is not in allowed push service list (SSRF protection)',
      }),
    expirationTime: z.number().nullable().optional(),
    keys: z
      .object({
        p256dh: z.string().min(1, 'p256dh key required').max(200, 'p256dh key exceeds limit'),
        auth: z.string().min(1, 'auth key required').max(100, 'auth key exceeds limit'),
      })
      .strict(),
    timezone: z.string().max(100).optional().default('Asia/Kolkata'),
  })
  .strict();

export const unsubscribeSchema = z
  .object({
    endpoint: z
      .string()
      .url('Invalid endpoint URL')
      .max(500, 'Endpoint exceeds 500 characters')
      .refine(isAllowedPushEndpoint, {
        message: 'Endpoint host is not in allowed push service list (SSRF protection)',
      }),
  })
  .strict();

export const adminActionSchema = z
  .object({
    action: z.enum(['sync_rss', 'trigger_daily_broadcast', 'send_daily_push']),
  })
  .strict();
