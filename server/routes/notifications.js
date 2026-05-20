import express from 'express';
import webpush from 'web-push';
import { getDb } from '../db.js';
import { authMiddleware, adminMiddleware } from '../helpers.js';

const router = express.Router();

// Get VAPID public key
router.get('/vapid-public-key', (req, res) => {
  res.status(200).json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// Save push subscription
router.post('/subscribe', authMiddleware, async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Missing subscription details' });
    }
    const db = getDb();
    await db.run('UPDATE users SET push_subscription = ? WHERE id = ?', [JSON.stringify(subscription), req.user.id]);
    return res.status(200).json({ success: true, message: 'Push subscription stored successfully' });
  } catch (err) {
    console.error('Push subscribe error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Broadcast push notification (Admin only)
router.post('/broadcast', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { title, body, url } = req.body;
    if (!title || !body) {
      return res.status(400).json({ error: 'Title and body are required' });
    }

    const payload = JSON.stringify({ title, body, url: url || '/' });
    const db = getDb();
    const subscribers = await db.all('SELECT id, username, push_subscription FROM users WHERE push_subscription IS NOT NULL');
    
    let successCount = 0;
    let failCount = 0;

    for (const subRow of subscribers) {
      try {
        const sub = JSON.parse(subRow.push_subscription);
        if (sub && sub.endpoint) {
          await webpush.sendNotification(sub, payload);
          successCount++;
        }
      } catch (err) {
        console.warn(`[PUSH] Send failed for user ${subRow.username}:`, err.message);
        if (err.statusCode === 410 || err.statusCode === 404) {
          await db.run('UPDATE users SET push_subscription = NULL WHERE id = ?', [subRow.id]);
        }
        failCount++;
      }
    }

    return res.status(200).json({
      success: true,
      message: `Broadcast finished. Successful: ${successCount}, Defunct/Removed: ${failCount}`
    });
  } catch (err) {
    console.error('Push broadcast error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
