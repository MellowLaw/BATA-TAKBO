import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { getDb } from './db.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

export const IS_PROD = process.env.NODE_ENV === 'production';
export const JWT_SECRET = process.env.JWT_SECRET;
export const AES_SECRET_KEY = process.env.AES_SECRET_KEY;

if (!JWT_SECRET || !AES_SECRET_KEY) {
  console.error('[FATAL] JWT_SECRET and AES_SECRET_KEY must be set in helpers.');
  process.exit(1);
}

// Nodemailer Transporter Configuration
const hasEmailCreds = process.env.EMAIL_USER && process.env.EMAIL_PASS;
export let transporter = null;
if (hasEmailCreds) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
  transporter.verify((error) => {
    if (error) {
      console.error('[EMAIL] Transporter verification FAILED:', error.message);
    } else {
      console.log('[EMAIL] Transporter ready. Emails can be sent.');
    }
  });
} else {
  console.log('[EMAIL] No credentials in .env - email features disabled (OK for dev)');
}

export async function blacklistToken(token) {
  if (!token) return;
  try {
    const db = getDb();
    let expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // default 30 days
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded.exp) expiresAt = decoded.exp * 1000;
    } catch (e) {}
    await db.run('INSERT INTO blacklisted_tokens (token, expires_at) VALUES (?, ?) ON CONFLICT (token) DO NOTHING', [token, expiresAt]);
  } catch (err) {
    console.error('Failed to blacklist token:', err);
  }
}

// Authentication middleware
export const authMiddleware = async (req, res, next) => {
  try {
    let token = req.cookies.jwt;
    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts[0] === 'Bearer' && parts[1]) {
        token = parts[1];
      }
    }
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const db = getDb();
    const isBlacklisted = await db.get('SELECT token FROM blacklisted_tokens WHERE token = ?', [token]);
    if (isBlacklisted) {
      return res.status(401).json({ error: 'Token invalidated' });
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await db.get('SELECT invalidate_before FROM users WHERE id = ?', [decoded.id]);
    if (user && user.invalidate_before && decoded.iat * 1000 < user.invalidate_before) {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Admin middleware
export const adminMiddleware = async (req, res, next) => {
  try {
    const db = getDb();
    const user = await db.get('SELECT is_admin, banned FROM users WHERE id = ?', [req.user.id]);
    if (!user || !user.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    if (user.banned) {
      return res.status(403).json({ error: 'Account banned' });
    }
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Username validation
export function isValidUsername(username) {
  if (!username || typeof username !== 'string') return false;
  const trimmed = username.trim();
  if (trimmed.length < 3 || trimmed.length > 20) return false;
  const regex = /^[a-zA-Z0-9_-]+$/;
  return regex.test(trimmed);
}

// Email validation
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(trimmed) && trimmed.length <= 255;
}

// Cryptographic encryption helper using AES-256-GCM
export function encryptData(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(AES_SECRET_KEY, 'hex'), iv);
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag().toString('base64');
  return JSON.stringify({
    iv: iv.toString('base64'),
    data: encrypted,
    tag: authTag
  });
}

// Cryptographic decryption helper using AES-256-GCM (with plaintext fallback for backward compatibility)
export function decryptData(encryptedJson) {
  if (!encryptedJson) return null;
  try {
    const parsed = JSON.parse(encryptedJson);
    if (parsed && parsed.iv && parsed.data && parsed.tag) {
      const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(AES_SECRET_KEY, 'hex'), Buffer.from(parsed.iv, 'base64'));
      decipher.setAuthTag(Buffer.from(parsed.tag, 'base64'));
      let decrypted = decipher.update(parsed.data, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    }
    return encryptedJson;
  } catch (err) {
    return encryptedJson;
  }
}
