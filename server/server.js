import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import webpush from 'web-push';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';

import { initDb } from './db.js';
import { IS_PROD } from './helpers.js';
import authRouter from './routes/auth.js';
import leaderboardRouter from './routes/leaderboard.js';
import adminRouter from './routes/admin.js';
import notificationsRouter from './routes/notifications.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const __envPath = path.join(__dirname, '.env');
dotenv.config({ path: __envPath });

const app = express();
const PORT = process.env.PORT || 3001;

// Auto-generate VAPID keys for Push Notifications if missing
if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
  try {
    const keys = webpush.generateVAPIDKeys();
    process.env.VAPID_PUBLIC_KEY = keys.publicKey;
    process.env.VAPID_PRIVATE_KEY = keys.privateKey;
    const envFile = path.join(__dirname, '.env');
    if (fs.existsSync(envFile)) {
      fs.appendFileSync(envFile, `\nVAPID_PUBLIC_KEY="${keys.publicKey}"\nVAPID_PRIVATE_KEY="${keys.privateKey}"\n`);
      console.log('[PUSH] Dynamic VAPID keys generated and appended to .env');
    } else {
      console.log('[PUSH] Dynamic VAPID keys generated in memory');
    }
  } catch (err) {
    console.error('[PUSH] Failed to generate VAPID keys:', err.message);
  }
}

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:support@batatakbo.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Trust proxy configuration in production (behind load balancers/reverse proxies)
if (IS_PROD) {
  app.set('trust proxy', 1);
}

// Redirect to HTTPS in production
app.use((req, res, next) => {
  if (IS_PROD && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(`https://${req.headers.host}${req.url}`);
  }
  next();
});

// Configure Helmet with strict Content Security Policy
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://cdn.jsdelivr.net"],
      connectSrc: ["'self'", "https://cdn.jsdelivr.net", "https://*.googleapis.com", "https://*.neon.tech", "wss://*", "http://localhost:3001"],
      workerSrc: ["'self'", "blob:"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS Configuration
app.use(cors({
  origin: IS_PROD ? process.env.FRONTEND_URL : 'http://localhost:5173',
  credentials: true
}));

// Express body parsers & Cookie Parser
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Global API rate-limiter
const globalApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/auth', globalApiLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: Date.now() });
});

// Route Handlers
app.use('/auth', authRouter);
app.use('/leaderboard', leaderboardRouter);
app.use('/admin', adminRouter);
app.use('/api/notifications', notificationsRouter);

// Database initialization and server bootstrap
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
