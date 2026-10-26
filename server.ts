import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import crypto from 'node:crypto';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

import { 
  chatRequestSchema, 
  pushSubscriptionSchema, 
  unsubscribeSchema,
  adminActionSchema 
} from './src/server/validation';
import { getAggregatedNews } from './src/server/rssService';
import { retrieveTopItems, buildSecuredRagPrompt } from './src/server/retrieval';
import { 
  saveSubscription, 
  removeSubscription, 
  sendDailyBroadcast,
  getVapidPublicKey 
} from './src/server/pushService';

dotenv.config();

export const app = express();

const isProduction = process.env.NODE_ENV === 'production';

// Rule 2: Trust proxy configured for rate limiting behind reverse proxies
app.set('trust proxy', 1);

// Rule 3 & 9: Strict Content Security Policy
// In production: remove 'unsafe-inline' from scriptSrc and remove ws:/wss: from connectSrc
const scriptSrcDirectives = isProduction ? ["'self'"] : ["'self'", "'unsafe-inline'"];
const connectSrcDirectives = isProduction
  ? ["'self'", 'https://fonts.googleapis.com', 'https://fonts.gstatic.com']
  : ["'self'", 'ws:', 'wss:', 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'];

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: scriptSrcDirectives,
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
        connectSrc: connectSrcDirectives,
        workerSrc: ["'self'", 'blob:'],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: isProduction ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// Rule 3 & 10: Restricted CORS allowlist from ALLOWED_ORIGINS & APP_URL
const rawAllowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : [];

const allowedOrigins = Array.from(
  new Set([
    process.env.APP_URL?.trim(),
    ...rawAllowedOrigins,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ].filter(Boolean) as string[])
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, or same-origin SPA)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Secret'],
  })
);

// Rule 2: 10kb JSON body limit
app.use(express.json({ limit: '10kb' }));

// Rule 8: Rate Limiting
// /api/chat: 10 req/min per IP
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    res.status(429).json({ error: 'Too many requests. Please wait a minute before asking again.' });
  },
});

// /api/news: 60 req/min per IP
const newsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    res.status(429).json({ error: 'Rate limit exceeded for news feed. Please wait a moment.' });
  },
});

// /api/push/*: 5 req/min per IP
const pushLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    res.status(429).json({ error: 'Too many push subscription requests. Please try again in a minute.' });
  },
});

// /api/admin/*: 10 req/min per IP
const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    res.status(429).json({ error: 'Too many admin requests.' });
  },
});

// Rule 9 & 22: Admin secret token verification using timingSafeEqual
export function verifyAdminSecret(req: Request): boolean {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) return false;

  const headerVal = (req.headers['x-admin-secret'] as string) || '';
  if (!headerVal) return false;

  const secretBuffer = Buffer.from(adminSecret);
  const providedBuffer = Buffer.from(headerVal);

  if (secretBuffer.length !== providedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(secretBuffer, providedBuffer);
}

// Rule 8: Health Check Endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// Rule 13: News Fetching & Caching Endpoint with 60/min rate limit
app.get('/api/news', newsLimiter, async (_req: Request, res: Response) => {
  try {
    const items = await getAggregatedNews(false);
    res.json({ items });
  } catch (err: any) {
    console.error('Server error fetching news:', err?.message || err);
    res.status(502).json({ error: 'Failed to retrieve news feed.' });
  }
});

// Rule 15: Push Notification Subscription Endpoints with 5/min rate limit
app.get('/api/push/public-key', (_req: Request, res: Response) => {
  res.json({ publicKey: getVapidPublicKey() });
});

app.post('/api/push/subscribe', pushLimiter, (req: Request, res: Response) => {
  const parseResult = pushSubscriptionSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: 'Invalid subscription data.' });
    return;
  }

  const result = saveSubscription(parseResult.data);
  res.status(201).json({ success: true, count: result.count, message: 'Subscribed to 7:00 AM daily alerts.' });
});

app.post('/api/push/unsubscribe', pushLimiter, (req: Request, res: Response) => {
  const parseResult = unsubscribeSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: 'Invalid request payload.' });
    return;
  }

  const result = removeSubscription(parseResult.data.endpoint);
  res.json({ success: result.success });
});

// Chatbot Endpoint (Rule 1, 2, 4, 6, 7, 10, 11) with 10 req/min rate limit
app.post('/api/chat', chatLimiter, async (req: Request, res: Response) => {
  const parseResult = chatRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: 'Invalid request. Prompt must be 1-2000 characters.' });
    return;
  }

  const { prompt } = parseResult.data;

  // Rule 1: The Gemini API key lives only in server env vars. Never accept user API keys.
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    res.status(502).json({ error: 'AI Assistant temporarily unavailable.' });
    return;
  }

  try {
    // Rule 11: Real retrieval from current news items
    const allNews = await getAggregatedNews(false);
    const retrieval = retrieveTopItems(prompt, allNews, 3);

    // Rule 11: If nothing relevant is found, say "I don't have that in today's news"
    if (!retrieval.canAnswer || retrieval.items.length === 0) {
      res.json({
        text: "I don't have that in today's news.",
        citations: [],
      });
      return;
    }

    // Rule 6: Build security-delimited prompt with prompt-injection defense
    const { systemInstruction, userPrompt } = buildSecuredRagPrompt(
      prompt,
      retrieval.items,
      retrieval.canAnswer
    );

    // Rule 10: Model name from env var with default 'gemini-2.5-flash'
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: { 'User-Agent': 'aistudio-build' },
        timeout: 20000, // 20s timeout
      },
    });

    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: userPrompt,
        config: {
          systemInstruction,
          maxOutputTokens: 600,
          temperature: 0.2,
        },
      });

      const answerText = response.text?.trim() || "I don't have that in today's news.";

      res.json({
        text: answerText,
        citations: retrieval.items.map((i) => ({
          id: i.id,
          title: i.title,
          sourceUrl: i.sourceUrl,
          sourceName: i.sourceName,
        })),
      });
    } catch (genErr: any) {
      // Security 11: If Gemini call fails, do NOT silently return a copied news snippet as the answer.
      // Log the error server-side, and return degraded: true with retrieved citations.
      console.error('Server-side Gemini generation error:', genErr?.message || genErr);

      res.json({
        degraded: true,
        text: 'AI is unavailable right now. Here are the most relevant stories:',
        citations: retrieval.items.map((i) => ({
          id: i.id,
          title: i.title,
          sourceUrl: i.sourceUrl,
          sourceName: i.sourceName,
        })),
      });
    }
  } catch (err: any) {
    // Rule 7: Log server-side only; return generic status code
    console.error('Server-side processing error:', err?.message || err);
    res.status(502).json({ error: 'Failed to process AI chat inquiry.' });
  }
});

// Admin / Notification Trigger Endpoint (Rule 9, 12, 19) with 10 req/min rate limit
app.post('/api/admin/action', adminLimiter, async (req: Request, res: Response) => {
  if (!verifyAdminSecret(req)) {
    res.status(403).json({ error: 'Unauthorized. Invalid admin credentials.' });
    return;
  }

  const parseResult = adminActionSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: 'Invalid admin action request.' });
    return;
  }

  // Security 12: Wrap admin action handlers in try/catch, return generic 502 errors, log server-side
  try {
    const { action } = parseResult.data;

    if (action === 'sync_rss') {
      const items = await getAggregatedNews(true);
      res.json({ success: true, count: items.length });
    } else if (action === 'trigger_daily_broadcast' || action === 'send_daily_push') {
      const broadcastResult = await sendDailyBroadcast();
      res.json({ success: true, notificationsDispatched: broadcastResult.sent, failed: broadcastResult.failed });
    } else {
      res.status(400).json({ error: 'Unknown action.' });
    }
  } catch (adminErr: any) {
    console.error('Admin action execution failed:', adminErr?.message || adminErr);
    res.status(502).json({ error: 'Admin operation failed.' });
  }
});

// Rule 3: 404 JSON for unknown /api/* routes
app.all('/api/*', (_req: Request, res: Response) => {
  res.status(404).json({ error: 'API route not found' });
});

// Security 13: Global Express error handler returning generic JSON with no stack traces
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled internal server error:', err?.message || err);
  res.status(500).json({ error: 'Internal error' });
});

// Dev and Prod Server Setup
async function startServer() {
  const PORT = parseInt(process.env.PORT || '3000', 10);

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile('index.html', { root: 'dist' });
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DigAI Server operational on port ${PORT}`);
  });
}

// Only launch when not running tests
if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  startServer();
}
