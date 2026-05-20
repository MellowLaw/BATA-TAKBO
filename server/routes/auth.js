import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { getDb } from '../db.js';
import {
  IS_PROD,
  JWT_SECRET,
  AES_SECRET_KEY,
  transporter,
  authMiddleware,
  adminMiddleware,
  isValidUsername,
  isValidEmail,
  encryptData,
  decryptData,
  blacklistToken
} from '../helpers.js';

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Too many reset requests. Try again in an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Check if username exists
router.post('/check-username', async (req, res) => {
  try {
    const { username } = req.body;
    if (!isValidUsername(username)) {
      return res.status(400).json({ error: 'Invalid username format' });
    }
    const sanitizedUsername = username.trim();
    const db = getDb();
    const user = await db.get('SELECT id, username FROM users WHERE LOWER(username) = LOWER(?)', [sanitizedUsername]);
    if (user) {
      return res.status(200).json({ exists: true, username: user.username });
    } else {
      return res.status(404).json({ exists: false });
    }
  } catch (err) {
    console.error('Check username error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Register user
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || typeof username !== 'string' || !email || typeof email !== 'string' || !password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid registration details' });
    }

    if (!isValidUsername(username)) {
      return res.status(400).json({ error: 'Invalid username' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (password.length < 8 || password.length > 50) {
      return res.status(400).json({ error: 'Password must be between 8 and 50 characters' });
    }

    if (!/\d/.test(password)) {
      return res.status(400).json({ error: 'Password must contain at least one number' });
    }

    if (!/[^a-zA-Z0-9]/.test(password)) {
      return res.status(400).json({ error: 'Password must contain at least one special character' });
    }

    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({ error: 'Password must contain at least one uppercase letter' });
    }

    if (/\s/.test(password)) {
      return res.status(400).json({ error: 'Password cannot contain spaces' });
    }

    const sanitizedUsername = username.trim();
    const sanitizedEmail = email.trim();

    const db = getDb();
    const existing = await db.get('SELECT id FROM users WHERE LOWER(username) = LOWER(?)', [sanitizedUsername]);
    if (existing) {
      return res.status(400).json({ error: 'Username already taken. Please try another.' });
    }

    const existingEmail = await db.get('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [sanitizedEmail]);
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already registered. Please login or try another.' });
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const initialData = JSON.stringify({ registeredAt: Date.now() });
    const dbEncryptedString = encryptData(initialData);

    const randomIconNum = (Math.floor(Math.random() * 40) + 1).toString().padStart(2, '0');
    const defaultAvatar = `/assets/ui/User Profiles/Icons_${randomIconNum}.png`;

    const result = await db.run(
      'INSERT INTO users (username, email, password_hash, encrypted_data, created_at, avatar_url) VALUES (?, ?, ?, ?, ?, ?)',
      [sanitizedUsername, sanitizedEmail, passwordHash, dbEncryptedString, Date.now(), defaultAvatar]
    );

    const token = jwt.sign({ id: result.lastID, username: sanitizedUsername }, JWT_SECRET, { expiresIn: '30d' });
      
    res.cookie('jwt', token, {
      httpOnly: true,
      maxAge: 2592000000,
      secure: IS_PROD,
      sameSite: IS_PROD ? 'none' : 'lax'
    });

    return res.status(200).json({ success: true, token, message: 'Account created efficiently!' });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: 'Username already taken.' });
    }
    console.error('Registration internal tracking error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || typeof username !== 'string' || !password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid credentials' });
    }
    
    const sanitizedUsername = username.trim();
    const db = getDb();
    const user = await db.get('SELECT * FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)', [sanitizedUsername, sanitizedUsername]);
    
    if (!user) {
      return res.status(401).json({ error: 'Incorrect password. Try again.' }); 
    }

    if (user.lockout_time > Date.now()) {
      return res.status(401).json({ error: 'Too many attempts. Try again later.' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (isValid) {
      if (user.banned) {
        return res.status(403).json({ 
          error: 'BANNED', 
          reason: user.ban_reason,
          appeal_status: user.ban_appeal ? 'pending' : 'none',
          username: user.username
        });
      }

      if (user.mfa_enabled) {
        if (!user.email) {
          return res.status(400).json({ error: 'MFA is enabled but no email address is registered to this account. Please contact an admin.' });
        }

        const code = String(crypto.randomInt(100000, 1000000));
        const expiry = Date.now() + 5 * 60 * 1000; // 5 minutes

        await db.run('UPDATE users SET failed_attempts = 0, lockout_time = 0, mfa_code = ?, mfa_code_expiry = ? WHERE id = ?', [code, expiry, user.id]);

        const mailOptions = {
          from: process.env.EMAIL_USER || '"Bata Takbo Support" <noreply@batatakbo.com>',
          to: user.email,
          subject: 'Your Login Verification Code — Bata, Takbo!',
          html: `
            <div style="font-family: monospace; background: #130f04; color: #f0e6d3; padding: 32px; max-width: 480px; margin: 0 auto; border-radius: 8px; border: 2px solid #ff6b1a;">
              <h2 style="color: #ff6b1a; letter-spacing: 2px; margin-bottom: 0.5rem; text-shadow: 0 0 10px rgba(255,107,26,0.3);">BATA, TAKBO!</h2>
              <h3 style="color: #e4cfc0; margin-top: 0; font-size: 1.1rem;">Security Verification Code</h3>
              <p style="color: #a89b8c; font-size: 0.9rem; line-height: 1.6;">Enter this verification code to complete your login:</p>
              <div style="background: #201c11; border: 2px solid #ff6b1a; border-radius: 4px; padding: 20px; text-align: center; font-size: 2.5rem; letter-spacing: 8px; margin: 20px 0; color: #fff; font-weight: bold; box-shadow: inset 0 0 10px rgba(0,0,0,0.8);">${code}</div>
              <p style="color: #a89b8c; font-size: 0.8rem;">This code will expire in <b style="color:#f0e6d3;">5 minutes</b>.</p>
              <p style="color: #5a5068; font-size: 0.75rem; margin-top: 24px;">If you did not request this, please change your password immediately.</p>
            </div>
          `
        };

        if (transporter) {
          try {
            await transporter.sendMail(mailOptions);
          } catch (mailErr) {
            console.error('[EMAIL] Login MFA mail error:', mailErr);
            return res.status(500).json({ error: 'Failed to send MFA verification email. Please check SMTP configuration.' });
          }
        } else {
          console.log(`[EMAIL] Login MFA code to: ${user.email} (code: ${code})`);
        }

        const tempToken = jwt.sign({ id: user.id, mfa_pending: true }, JWT_SECRET, { expiresIn: '10m' });
        return res.status(200).json({ success: true, mfaRequired: true, tempToken, username: user.username });
      }

      await db.run('UPDATE users SET failed_attempts = 0, lockout_time = 0, last_login = ? WHERE id = ?', [Date.now(), user.id]);
      const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
      
      res.cookie('jwt', token, {
        httpOnly: true,
        maxAge: 2592000000,
        secure: IS_PROD,
        sameSite: IS_PROD ? 'none' : 'lax'
      });

      let gameData = null;
      try {
        if (user.game_data) {
          const decrypted = decryptData(user.game_data);
          if (decrypted) gameData = JSON.parse(decrypted);
        }
      } catch (e) {
        console.error('Failed to parse game data on login:', e);
      }

      const modelRow = await db.get('SELECT model_data FROM user_gesture_models WHERE user_id = ?', [user.id]);
      if (modelRow && modelRow.model_data) {
        try {
          if (!gameData) gameData = {};
          const decryptedModel = decryptData(modelRow.model_data);
          if (decryptedModel) gameData.gestureModel = JSON.parse(decryptedModel);
        } catch(e) { /* ignore */ }
      }

      return res.status(200).json({ success: true, token, gameData });
    } else {
      let attempts = user.failed_attempts + 1;
      let lockoutTime = 0;
      let msg = 'Incorrect password. Try again.';
      
      if (attempts >= 5) {
        lockoutTime = Date.now() + 15 * 60 * 1000;
        msg = 'Too many attempts. Try again later.';
      }
      
      await db.run('UPDATE users SET failed_attempts = ?, lockout_time = ? WHERE id = ?', [attempts, lockoutTime, user.id]);
      return res.status(401).json({ error: msg });
    }
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify MFA code during login
router.post('/login/verify-mfa', async (req, res) => {
  try {
    const { code, tempToken } = req.body;
    if (!code || !tempToken) {
      return res.status(400).json({ error: 'Verification code and temporary token are required.' });
    }

    let payload;
    try {
      payload = jwt.verify(tempToken, JWT_SECRET);
    } catch (jwtErr) {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }

    if (!payload.mfa_pending) {
      return res.status(400).json({ error: 'Invalid authentication request.' });
    }

    const db = getDb();
    const user = await db.get('SELECT * FROM users WHERE id = ?', [payload.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.mfa_code !== String(code).trim()) {
      return res.status(400).json({ error: 'Incorrect verification code.' });
    }
    if (Date.now() > user.mfa_code_expiry) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    // Success! Clear the MFA code and issue standard JWT session cookie
    await db.run('UPDATE users SET mfa_code = NULL, mfa_code_expiry = NULL, last_login = ? WHERE id = ?', [Date.now(), user.id]);

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
    res.cookie('jwt', token, {
      httpOnly: true,
      maxAge: 2592000000,
      secure: IS_PROD,
      sameSite: IS_PROD ? 'none' : 'lax'
    });

    let gameData = null;
    try {
      if (user.game_data) {
        const decrypted = decryptData(user.game_data);
        if (decrypted) gameData = JSON.parse(decrypted);
      }
    } catch (e) {
      console.error('Failed to parse game data on login:', e);
    }

    const modelRow = await db.get('SELECT model_data FROM user_gesture_models WHERE user_id = ?', [user.id]);
    if (modelRow && modelRow.model_data) {
      try {
        if (!gameData) gameData = {};
        const decryptedModel = decryptData(modelRow.model_data);
        if (decryptedModel) gameData.gestureModel = JSON.parse(decryptedModel);
      } catch (e) { /* ignore */ }
    }

    return res.status(200).json({ success: true, token, gameData });
  } catch (err) {
    console.error('Login MFA verification error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Resend MFA code during login
router.post('/login/resend-mfa', async (req, res) => {
  try {
    const { tempToken } = req.body;
    if (!tempToken) return res.status(400).json({ error: 'Temporary token is required.' });

    let payload;
    try {
      payload = jwt.verify(tempToken, JWT_SECRET);
    } catch (jwtErr) {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }

    if (!payload.mfa_pending) {
      return res.status(400).json({ error: 'Invalid authentication request.' });
    }

    const db = getDb();
    const user = await db.get('SELECT email, username FROM users WHERE id = ?', [payload.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.email) return res.status(400).json({ error: 'No email address registered for this user.' });

    const code = String(crypto.randomInt(100000, 1000000));
    const expiry = Date.now() + 5 * 60 * 1000; // 5 minutes

    await db.run('UPDATE users SET mfa_code = ?, mfa_code_expiry = ? WHERE id = ?', [code, expiry, payload.id]);

    const mailOptions = {
      from: process.env.EMAIL_USER || '"Bata Takbo Support" <noreply@batatakbo.com>',
      to: user.email,
      subject: 'New Login Verification Code — Bata, Takbo!',
      html: `
        <div style="font-family: monospace; background: #130f04; color: #f0e6d3; padding: 32px; max-width: 480px; margin: 0 auto; border-radius: 8px; border: 2px solid #ff6b1a;">
          <h2 style="color: #ff6b1a; letter-spacing: 2px; margin-bottom: 0.5rem; text-shadow: 0 0 10px rgba(255,107,26,0.3);">BATA, TAKBO!</h2>
          <h3 style="color: #e4cfc0; margin-top: 0; font-size: 1.1rem;">Security Verification Code</h3>
          <p style="color: #a89b8c; font-size: 0.9rem; line-height: 1.6;">Enter this verification code to complete your login:</p>
          <div style="background: #201c11; border: 2px solid #ff6b1a; border-radius: 4px; padding: 20px; text-align: center; font-size: 2.5rem; letter-spacing: 8px; margin: 20px 0; color: #fff; font-weight: bold; box-shadow: inset 0 0 10px rgba(0,0,0,0.8);">${code}</div>
          <p style="color: #a89b8c; font-size: 0.8rem;">This code will expire in <b style="color:#f0e6d3;">5 minutes</b>.</p>
          <p style="color: #5a5068; font-size: 0.75rem; margin-top: 24px;">If you did not request this, please change your password immediately.</p>
        </div>
      `
    };

    if (transporter) {
      try {
        await transporter.sendMail(mailOptions);
      } catch (mailErr) {
        console.error('[EMAIL] Resend login MFA mail error:', mailErr);
        return res.status(500).json({ error: 'Failed to send MFA verification email. Please check SMTP settings.' });
      }
    } else {
      console.log(`[EMAIL] Resend Login MFA code to: ${user.email} (code: ${code})`);
    }

    return res.status(200).json({ success: true, message: 'New verification code sent to your email.' });
  } catch (err) {
    console.error('Login MFA resend error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Appeal ban
router.post('/appeal-ban', async (req, res) => {
  try {
    const { username, password, appeal } = req.body;
    if (!username || !password || !appeal || appeal.trim() === '') {
      return res.status(400).json({ error: 'Missing information' });
    }

    const sanitizedUsername = username.trim();
    const db = getDb();
    const user = await db.get('SELECT * FROM users WHERE LOWER(username) = LOWER(?)', [sanitizedUsername]);
    
    if (!user) return res.status(401).json({ error: 'Authentication failed' });
    if (!user.banned) return res.status(400).json({ error: 'User is not banned' });

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return res.status(401).json({ error: 'Authentication failed' });

    await db.run('UPDATE users SET ban_appeal = ? WHERE id = ?', [appeal.trim(), user.id]);
    return res.status(200).json({ success: true, message: 'Appeal submitted successfully' });
  } catch (err) {
    console.error('Appeal error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let registeredAt = null;
    try {
      if (user.encrypted_data) {
        const decrypted = decryptData(user.encrypted_data);
        if (decrypted) {
          const parsed = JSON.parse(decrypted);
          registeredAt = parsed.registeredAt;
        }
      }
    } catch(e) {
      console.error('Failed to decrypt user data:', e);
    }

    return res.status(200).json({
      username: user.username,
      email: user.email || null,
      accountType: 'Registered',
      registeredAt: registeredAt,
      avatar_url: user.avatar_url || null,
      bio: user.bio || null,
      mfa_enabled: !!user.mfa_enabled
    });
  } catch (err) {
    console.error('Profile error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get profile endless runs count
router.get('/profile/endless-runs', authMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const row = await db.get('SELECT COUNT(*) as count FROM inf_scores WHERE user_id = ?', [req.user.id]);
    return res.status(200).json({ count: row?.count || 0 });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Save game data
router.post('/save-data', authMiddleware, async (req, res) => {
  try {
    const { settings, tutorialComplete, gestureSetupComplete, chapterProgress, gestureModel } = req.body;
    let existing = {};
    const db = getDb();
    try {
      const row = await db.get('SELECT game_data FROM users WHERE id = ?', [req.user.id]);
      if (row && row.game_data) {
        const decrypted = decryptData(row.game_data);
        if (decrypted) existing = JSON.parse(decrypted) || {};
      }
    } catch (e) { /* ignore */ }

    const gameData = {
      ...existing,
      ...(settings !== undefined ? { settings } : {}),
      ...(tutorialComplete !== undefined ? { tutorialComplete } : {}),
      ...(gestureSetupComplete !== undefined ? { gestureSetupComplete } : {}),
      ...(chapterProgress !== undefined ? { chapterProgress } : {}),
    };

    await db.run('UPDATE users SET game_data = ? WHERE id = ?', [encryptData(JSON.stringify(gameData)), req.user.id]);

    if (gestureModel !== undefined && gestureModel !== null) {
      const upsertSql = `INSERT INTO user_gesture_models (user_id, model_data, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT (user_id) DO UPDATE SET model_data = EXCLUDED.model_data, updated_at = EXCLUDED.updated_at`;
      await db.run(upsertSql, [req.user.id, encryptData(JSON.stringify(gestureModel)), Date.now()]);
    }

    const verifyRow = await db.get('SELECT game_data FROM users WHERE id = ?', [req.user.id]);
    let stored = null;
    try {
      if (verifyRow && verifyRow.game_data) {
        const decrypted = decryptData(verifyRow.game_data);
        if (decrypted) stored = JSON.parse(decrypted);
      }
    } catch(e) {}
    return res.status(200).json({ success: true, gameData: stored });
  } catch (err) {
    console.error('Save data error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /auth/me load saved game state
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const row = await db.get('SELECT username, game_data FROM users WHERE id = ?', [req.user.id]);
    if (!row) return res.status(404).json({ error: 'User not found' });

    let gameData = null;
    try {
      if (row.game_data) {
        const decrypted = decryptData(row.game_data);
        if (decrypted) gameData = JSON.parse(decrypted);
      }
    } catch(e) {
      console.error('[ME] Failed to parse game_data for', row.username, e);
    }

    const modelRow = await db.get('SELECT model_data FROM user_gesture_models WHERE user_id = ?', [req.user.id]);
    if (modelRow && modelRow.model_data) {
      try {
        if (!gameData) gameData = {};
        const decryptedModel = decryptData(modelRow.model_data);
        if (decryptedModel) gameData.gestureModel = JSON.parse(decryptedModel);
      } catch(e) { /* ignore malformed model */ }
    }

    return res.status(200).json({ username: row.username, gameData });
  } catch (err) {
    console.error('/auth/me error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Change password
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || typeof currentPassword !== 'string' || !newPassword || typeof newPassword !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid required fields' });
    }

    if (newPassword.length < 8 || newPassword.length > 50) {
      return res.status(400).json({ error: 'New password must be 8-50 characters' });
    }

    if (!/\d/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must contain at least one number' });
    }

    if (!/[^a-zA-Z0-9]/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must contain at least one special character' });
    }

    if (!/[A-Z]/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must contain at least one uppercase letter' });
    }

    if (/\s/.test(newPassword)) {
      return res.status(400).json({ error: 'Password cannot contain spaces' });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ error: 'New password must be different' });
    }

    const db = getDb();
    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Incorrect current password' });
    }

    const salt = await bcrypt.genSalt(12);
    const newHash = await bcrypt.hash(newPassword, salt);

    await db.run('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId]);

    return res.status(200).json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Change username
router.post('/change-username', authMiddleware, async (req, res) => {
  try {
    const { newUsername } = req.body;
    if (!newUsername || typeof newUsername !== 'string') return res.status(400).json({ error: 'New username is required and must be a string' });

    if (!isValidUsername(newUsername)) {
      return res.status(400).json({ error: 'Username must be 3-20 characters and contain only letters, numbers, underscores, or hyphens' });
    }

    const trimmed = newUsername.trim();
    const db = getDb();
    const existing = await db.get('SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND id != ?', [trimmed, req.user.id]);
    if (existing) {
      return res.status(409).json({ error: 'Username is already taken' });
    }

    const currentUser = await db.get('SELECT username_changed_at FROM users WHERE id = ?', [req.user.id]);
    if (currentUser && currentUser.username_changed_at) {
      const cooldownMs = 7 * 24 * 60 * 60 * 1000;
      const elapsed = Date.now() - currentUser.username_changed_at;
      if (elapsed < cooldownMs) {
        const daysLeft = Math.ceil((cooldownMs - elapsed) / (24 * 60 * 60 * 1000));
        return res.status(429).json({ error: `You can change your username again in ${daysLeft} day(s).` });
      }
    }

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('UPDATE users SET username = $1, username_changed_at = $2 WHERE id = $3', [trimmed, Date.now(), req.user.id]);
      await client.query('UPDATE inf_scores SET username = $1 WHERE user_id = $2', [trimmed, req.user.id]);
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    const newToken = jwt.sign({ id: req.user.id, username: trimmed }, JWT_SECRET, { expiresIn: '30d' });
    res.cookie('jwt', newToken, {
      httpOnly: true,
      maxAge: 2592000000,
      secure: IS_PROD,
      sameSite: IS_PROD ? 'none' : 'lax'
    });

    return res.status(200).json({ success: true, username: trimmed });
  } catch (err) {
    console.error('Change username error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Change avatar
router.post('/change-avatar', authMiddleware, async (req, res) => {
  try {
    const { avatarUrl } = req.body;
    if (avatarUrl !== null && typeof avatarUrl !== 'string') {
      return res.status(400).json({ error: 'Invalid avatar data type' });
    }

    if (avatarUrl) {
      const isDataUrl = avatarUrl.startsWith('data:image/');
      const isHttpUrl = avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://');
      const isLocalAsset = avatarUrl.startsWith('/assets/');

      if (!isDataUrl && !isHttpUrl && !isLocalAsset) {
        return res.status(400).json({ error: 'Must be a valid image URL or uploaded image file' });
      }

      if (isDataUrl && avatarUrl.length > 2 * 1024 * 1024 * 1.37) {
        return res.status(413).json({ error: 'Image is too large. Please use an image under 2MB.' });
      }
    }

    const db = getDb();
    await db.run('UPDATE users SET avatar_url = ? WHERE id = ?', [avatarUrl || null, req.user.id]);
    res.json({ success: true, avatarUrl: avatarUrl || null });
  } catch (error) {
    console.error('Change avatar error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change bio
router.post('/change-bio', authMiddleware, async (req, res) => {
  try {
    const { bio } = req.body;
    if (typeof bio !== 'string') {
      return res.status(400).json({ error: 'Invalid bio format' });
    }
    const trimmedBio = bio.trim().substring(0, 150);
    const db = getDb();
    await db.run('UPDATE users SET bio = ? WHERE id = ?', [trimmedBio || null, req.user.id]);
    res.json({ success: true, bio: trimmedBio || null });
  } catch (error) {
    console.error('Change bio error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change email
router.post('/change-email', authMiddleware, async (req, res) => {
  try {
    const { newEmail, password } = req.body;
    if (!newEmail || typeof newEmail !== 'string' || !password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password are required and must be text' });
    }

    if (!isValidEmail(newEmail)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    const db = getDb();
    const user = await db.get('SELECT id, password_hash FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Incorrect password' });

    const existing = await db.get('SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id != ?', [newEmail.trim(), req.user.id]);
    if (existing) return res.status(409).json({ error: 'That email is already in use by another account' });

    await db.run('UPDATE users SET email = ? WHERE id = ?', [newEmail.trim().toLowerCase(), req.user.id]);
    return res.status(200).json({ success: true, message: 'Email updated successfully' });
  } catch (err) {
    console.error('Change email error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout all devices
router.post('/logout-all', authMiddleware, async (req, res) => {
  try {
    const db = getDb();
    await db.run('UPDATE users SET invalidate_before = ? WHERE id = ?', [Date.now(), req.user.id]);
    const token = req.cookies.jwt;
    if (token) await blacklistToken(token);
    res.clearCookie('jwt', { httpOnly: true, secure: IS_PROD, sameSite: IS_PROD ? 'none' : 'lax' });
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Logout all error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout', authMiddleware, async (req, res) => {
  const token = req.cookies.jwt;
  if (token) await blacklistToken(token);
  res.clearCookie('jwt', {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: IS_PROD ? 'none' : 'lax'
  });
  return res.status(200).json({ success: true });
});

// Delete account
router.delete('/delete-account', authMiddleware, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || typeof password !== 'string') return res.status(400).json({ error: 'A valid password is required to delete your account' });

    const db = getDb();
    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return res.status(401).json({ error: 'Incorrect password' });

    await db.run('DELETE FROM users WHERE id = ?', [req.user.id]);

    const token = req.cookies.jwt;
    if (token) await blacklistToken(token);
    res.clearCookie('jwt', { httpOnly: true, secure: IS_PROD, sameSite: IS_PROD ? 'none' : 'lax' });

    return res.status(200).json({ success: true, message: 'Account deleted successfully' });
  } catch (err) {
    console.error('Delete account error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Setup MFA (Generate & send code to verify email before enabling)
router.post('/mfa/setup', authMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const user = await db.get('SELECT email, username FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.email) return res.status(400).json({ error: 'Please set an email address first to enable MFA.' });

    const code = String(crypto.randomInt(100000, 1000000));
    const expiry = Date.now() + 5 * 60 * 1000; // 5 minutes

    await db.run('UPDATE users SET mfa_code = ?, mfa_code_expiry = ? WHERE id = ?', [code, expiry, req.user.id]);

    const mailOptions = {
      from: process.env.EMAIL_USER || '"Bata Takbo Support" <noreply@batatakbo.com>',
      to: user.email,
      subject: 'Enable Multi-Factor Authentication — Bata, Takbo!',
      html: `
        <div style="font-family: monospace; background: #130f04; color: #f0e6d3; padding: 32px; max-width: 480px; margin: 0 auto; border-radius: 8px; border: 2px solid #ff6b1a;">
          <h2 style="color: #ff6b1a; letter-spacing: 2px; margin-bottom: 0.5rem; text-shadow: 0 0 10px rgba(255,107,26,0.3);">BATA, TAKBO!</h2>
          <h3 style="color: #e4cfc0; margin-top: 0; font-size: 1.1rem;">Enable Multi-Factor Authentication</h3>
          <p style="color: #a89b8c; font-size: 0.9rem; line-height: 1.6;">Use the following verification code to enable MFA on your account:</p>
          <div style="background: #201c11; border: 2px solid #ff6b1a; border-radius: 4px; padding: 20px; text-align: center; font-size: 2.5rem; letter-spacing: 8px; margin: 20px 0; color: #fff; font-weight: bold; box-shadow: inset 0 0 10px rgba(0,0,0,0.8);">${code}</div>
          <p style="color: #a89b8c; font-size: 0.8rem;">This code will expire in <b style="color:#f0e6d3;">5 minutes</b>.</p>
          <p style="color: #5a5068; font-size: 0.75rem; margin-top: 24px;">If you did not request this, you can safely ignore this email.</p>
        </div>
      `
    };

    if (transporter) {
      try {
        await transporter.sendMail(mailOptions);
      } catch (mailErr) {
        console.error('[EMAIL] Setup MFA mail error:', mailErr);
        return res.status(500).json({ error: 'Failed to send verification email. Please check your SMTP settings.' });
      }
    } else {
      console.log(`[EMAIL] Would send MFA setup code to: ${user.email} (code: ${code})`);
    }

    return res.status(200).json({ success: true, message: 'Verification code sent to your registered email.' });
  } catch (err) {
    console.error('MFA setup error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Enable MFA after verifying code
router.post('/mfa/enable', authMiddleware, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Verification code is required.' });

    const db = getDb();
    const user = await db.get('SELECT mfa_code, mfa_code_expiry FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.mfa_code !== String(code).trim()) {
      return res.status(400).json({ error: 'Incorrect verification code.' });
    }
    if (Date.now() > user.mfa_code_expiry) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    await db.run('UPDATE users SET mfa_enabled = TRUE, mfa_code = NULL, mfa_code_expiry = NULL WHERE id = ?', [req.user.id]);
    return res.status(200).json({ success: true, message: 'MFA enabled successfully!' });
  } catch (err) {
    console.error('MFA enable error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Disable MFA (requires password confirmation)
router.post('/mfa/disable', authMiddleware, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password is required to disable MFA.' });

    const db = getDb();
    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return res.status(401).json({ error: 'Incorrect password.' });

    await db.run('UPDATE users SET mfa_enabled = FALSE, mfa_code = NULL, mfa_code_expiry = NULL WHERE id = ?', [req.user.id]);
    return res.status(200).json({ success: true, message: 'MFA disabled successfully.' });
  } catch (err) {
    console.error('MFA disable error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Forgot username
router.post('/forgot-username', forgotPasswordLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const sanitizedEmail = email.trim();
    const db = getDb();
    const user = await db.get('SELECT username FROM users WHERE LOWER(email) = LOWER(?)', [sanitizedEmail]);

    if (user) {
      const mailOptions = {
        from: process.env.EMAIL_USER || '"Bata Takbo Support" <noreply@batatakbo.com>',
        to: sanitizedEmail,
        subject: 'Your Bata, Takbo! Username',
        html: `
          <div style="font-family: monospace; background: #130f04; color: #f0e6d3; padding: 32px; max-width: 480px; margin: 0 auto; border-radius: 8px;">
            <h2 style="color: #E4CFC0; letter-spacing: 2px;">BATA, TAKBO!</h2>
            <p>Here is your username:</p>
            <div style="background: #201c11; border: 1px solid #E4CFC0; border-radius: 4px; padding: 16px; text-align: center; font-size: 1.4rem; letter-spacing: 3px; margin: 16px 0;">${user.username}</div>
            <p style="color: #5a5068; font-size: 0.8rem;">If you didn't request this, you can safely ignore this email.</p>
          </div>
        `
      };
      if (transporter) {
        try { await transporter.sendMail(mailOptions); } catch (mailErr) { console.error('Forgot username mail error:', mailErr); }
      } else {
        console.log('[EMAIL] Would send forgot username email to:', sanitizedEmail);
      }
    }

    return res.status(200).json({ success: true, message: 'If that email is registered, your username has been sent.' });
  } catch (err) {
    console.error('Forgot username error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Forgot password
router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const sanitizedEmail = email.trim();
    const db = getDb();
    const user = await db.get('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [sanitizedEmail]);

    if (user) {
      const code = String(crypto.randomInt(100000, 1000000));
      const expiry = Date.now() + 15 * 60 * 1000;

      await db.run('UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?', [code, expiry, user.id]);

      const mailOptions = {
        from: process.env.EMAIL_USER || '"Bata Takbo Support" <noreply@batatakbo.com>',
        to: sanitizedEmail,
        subject: 'Your Password Reset Code — Bata, Takbo!',
        html: `
          <div style="font-family: monospace; background: #130f04; color: #f0e6d3; padding: 32px; max-width: 480px; margin: 0 auto; border-radius: 8px;">
            <h2 style="color: #E4CFC0; letter-spacing: 2px; margin-bottom: 0.5rem;">BATA, TAKBO!</h2>
            <p style="color: #a89b8c; font-size: 0.9rem; margin-bottom: 1.5rem;">You requested a password reset. Enter this code in the app:</p>
            <div style="background: #201c11; border: 2px solid #E4CFC0; border-radius: 4px; padding: 20px; text-align: center; font-size: 2.5rem; letter-spacing: 8px; margin: 0 0 1.5rem; color: #fff;">${code}</div>
            <p style="color: #a89b8c; font-size: 0.8rem; margin-bottom: 0.5rem;">This code expires in <b style="color:#f0e6d3;">15 minutes</b>.</p>
            <p style="color: #5a5068; font-size: 0.75rem;">If you did not request this, you can safely ignore this email.</p>
          </div>
        `
      };

      if (transporter) {
        try {
          await transporter.sendMail(mailOptions);
        } catch (emailErr) {
          console.error(`[ERROR] Failed to send reset code to ${sanitizedEmail}:`, emailErr);
        }
      } else {
        console.log(`[EMAIL] Would send reset code to: ${sanitizedEmail} (dev mode)`);
      }
    }

    return res.status(200).json({ success: true, message: 'If that email is registered, a 6-digit code was sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify reset code
router.post('/verify-reset-code', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'Email and code are required' });

    const db = getDb();
    const user = await db.get('SELECT id, reset_token, reset_token_expiry FROM users WHERE LOWER(email) = LOWER(?)', [email.trim()]);

    if (!user || user.reset_token !== String(code).trim()) {
      return res.status(400).json({ error: 'Incorrect code. Please check your email and try again.' });
    }
    if (Date.now() > user.reset_token_expiry) {
      return res.status(400).json({ error: 'expired' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Verify reset code error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) return res.status(400).json({ error: 'Missing required fields' });

    if (newPassword.length < 8 || newPassword.length > 50) {
      return res.status(400).json({ error: 'Password must be between 8 and 50 characters' });
    }
    if (!/\d/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must contain at least one number' });
    }
    if (!/[^a-zA-Z0-9]/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must contain at least one special character' });
    }
    if (!/[A-Z]/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must contain at least one uppercase letter' });
    }
    if (/\s/.test(newPassword)) {
      return res.status(400).json({ error: 'Password cannot contain spaces' });
    }

    const db = getDb();
    const user = await db.get('SELECT id, reset_token, reset_token_expiry FROM users WHERE LOWER(email) = LOWER(?)', [email.trim()]);

    if (!user || user.reset_token !== String(code).trim()) {
      return res.status(400).json({ error: 'Invalid or expired code.' });
    }
    if (Date.now() > user.reset_token_expiry) {
      return res.status(400).json({ error: 'expired' });
    }

    const salt = await bcrypt.genSalt(12);
    const newHash = await bcrypt.hash(newPassword, salt);

    await db.run('UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?', [newHash, user.id]);

    return res.status(200).json({ success: true, message: 'Password has been successfully reset.' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE gesture model - clear trained gestures
router.delete('/gesture-model', authMiddleware, async (req, res) => {
  try {
    const db = getDb();
    await db.run('DELETE FROM user_gesture_models WHERE user_id = ?', [req.user.id]);
    return res.status(200).json({ success: true, message: 'Gesture model cleared.' });
  } catch (err) {
    console.error('Clear gesture model error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// MFA SETUP - Send verification code to user's email
router.post('/mfa/setup', authMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const user = await db.get('SELECT id, email, username, mfa_enabled FROM users WHERE id = ?', [req.user.id]);

    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.email) return res.status(400).json({ error: 'No email address on file. Please add an email first.' });
    if (user.mfa_enabled) return res.status(400).json({ error: 'MFA is already enabled.' });

    const code = String(crypto.randomInt(100000, 1000000));
    const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes

    await db.run('UPDATE users SET mfa_setup_code = ?, mfa_setup_expiry = ? WHERE id = ?', [code, expiry, user.id]);

    const mailOptions = {
      from: process.env.EMAIL_USER || '"Bata Takbo Support" <noreply@batatakbo.com>',
      to: user.email,
      subject: 'MFA Setup Verification Code — Bata, Takbo!',
      html: `
        <div style="font-family: monospace; background: #130f04; color: #f0e6d3; padding: 32px; max-width: 480px; margin: 0 auto; border-radius: 8px; border: 2px solid #ff6b1a;">
          <h2 style="color: #ff6b1a; letter-spacing: 2px; margin-bottom: 0.5rem; text-shadow: 0 0 10px rgba(255,107,26,0.3);">BATA, TAKBO!</h2>
          <h3 style="color: #e4cfc0; margin-top: 0; font-size: 1.1rem;">MFA Setup Code</h3>
          <p style="color: #a89b8c; font-size: 0.9rem; line-height: 1.6;">Enter this verification code to enable Two-Factor Authentication:</p>
          <div style="background: #201c11; border: 2px solid #ff6b1a; border-radius: 4px; padding: 20px; text-align: center; font-size: 2.5rem; letter-spacing: 8px; margin: 20px 0; color: #fff; font-weight: bold; box-shadow: inset 0 0 10px rgba(0,0,0,0.8);">${code}</div>
          <p style="color: #a89b8c; font-size: 0.8rem;">This code will expire in <b style="color:#f0e6d3;">10 minutes</b>.</p>
          <p style="color: #5a5068; font-size: 0.75rem; margin-top: 24px;">If you did not request this, please change your password immediately.</p>
        </div>
      `
    };

    if (transporter) {
      try {
        await transporter.sendMail(mailOptions);
      } catch (mailErr) {
        console.error('[EMAIL] MFA setup mail error:', mailErr);
        return res.status(500).json({ error: 'Failed to send verification email. Please check SMTP configuration.' });
      }
    } else {
      console.log(`[EMAIL] MFA setup code to: ${user.email} (code: ${code})`);
    }

    return res.status(200).json({ success: true, message: 'Verification code sent to your email.' });
  } catch (err) {
    console.error('MFA setup error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// MFA ENABLE - Verify code and enable MFA
router.post('/mfa/enable', authMiddleware, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Verification code is required.' });

    const db = getDb();
    const user = await db.get('SELECT id, email, mfa_enabled, mfa_setup_code, mfa_setup_expiry FROM users WHERE id = ?', [req.user.id]);

    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.mfa_enabled) return res.status(400).json({ error: 'MFA is already enabled.' });
    if (!user.mfa_setup_code || !user.mfa_setup_expiry) {
      return res.status(400).json({ error: 'No MFA setup in progress. Please request a new code.' });
    }
    if (user.mfa_setup_code !== String(code).trim()) {
      return res.status(400).json({ error: 'Incorrect verification code.' });
    }
    if (Date.now() > user.mfa_setup_expiry) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    await db.run('UPDATE users SET mfa_enabled = 1, mfa_setup_code = NULL, mfa_setup_expiry = NULL WHERE id = ?', [user.id]);

    return res.status(200).json({ success: true, message: 'Two-Factor Authentication has been enabled.' });
  } catch (err) {
    console.error('MFA enable error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// MFA DISABLE - Turn off MFA with password verification
router.post('/mfa/disable', authMiddleware, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password is required.' });

    const db = getDb();
    const user = await db.get('SELECT id, password_hash, mfa_enabled FROM users WHERE id = ?', [req.user.id]);

    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.mfa_enabled) return res.status(400).json({ error: 'MFA is not enabled.' });

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return res.status(401).json({ error: 'Incorrect password.' });

    await db.run('UPDATE users SET mfa_enabled = 0, mfa_code = NULL, mfa_code_expiry = NULL WHERE id = ?', [user.id]);

    return res.status(200).json({ success: true, message: 'Two-Factor Authentication has been disabled.' });
  } catch (err) {
    console.error('MFA disable error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
