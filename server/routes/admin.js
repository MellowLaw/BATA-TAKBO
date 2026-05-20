import express from 'express';
import jwt from 'jsonwebtoken';
import { getDb } from '../db.js';
import { authMiddleware, adminMiddleware, JWT_SECRET } from '../helpers.js';

const router = express.Router();

// Check if current user is admin
router.get('/check', authMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const user = await db.get('SELECT is_admin, banned FROM users WHERE id = ?', [req.user.id]);
    if (!user || user.banned) {
      return res.status(403).json({ isAdmin: false, error: 'Account banned' });
    }
    return res.status(200).json({ isAdmin: !!user.is_admin });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all users (admin only)
router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const users = await db.all(`
      SELECT u.id, u.username, u.email, u.is_admin, u.banned, u.ban_reason, u.ban_appeal, u.cheat_score, u.last_login, u.created_at, u.mfa_enabled,
             CASE WHEN u.game_data IS NOT NULL THEN 1 ELSE 0 END as has_game_data,
             (SELECT COUNT(*) FROM inf_scores WHERE user_id = u.id) as games_played,
             (SELECT COALESCE(SUM(score), 0) FROM inf_scores WHERE user_id = u.id) as total_score
      FROM users u
      ORDER BY u.id DESC
    `);
    const mappedUsers = users.map(u => ({
      ...u,
      created_at: u.created_at ? Number(u.created_at) : null,
      last_login: u.last_login ? Number(u.last_login) : null
    }));
    return res.status(200).json({ users: mappedUsers });
  } catch (err) {
    console.error('Admin get users error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get admin stats (admin only)
router.get('/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const totalUsers = (await db.get('SELECT COUNT(*) as c FROM users')).c;
    const totalEndlessGames = (await db.get('SELECT COUNT(*) as c FROM inf_scores')).c;
    const totalNormalGames = 0;
    
    const dbSizeRow = await db.get(`SELECT pg_database_size(current_database()) as size`);
    const dbSize = parseInt(dbSizeRow?.size || 0);
    const uptime = process.uptime();
    
    const keyboardGamesRow = await db.get("SELECT COUNT(*) as c FROM inf_scores WHERE control_type = 'keyboard'");
    const keyboardGames = parseInt(keyboardGamesRow?.c || 0);
    const gestureGamesRow = await db.get("SELECT COUNT(*) as c FROM inf_scores WHERE control_type = 'gesture'");
    const gestureGames = parseInt(gestureGamesRow?.c || 0);

    const recentScores = await db.all("SELECT username, 'Endless Ch' || chapter_id as action, created_at as time, score as value FROM inf_scores ORDER BY created_at DESC LIMIT 20");
    const recentLogins = await db.all("SELECT username, 'Login' as action, last_login as time, 0 as value FROM users WHERE last_login IS NOT NULL ORDER BY last_login DESC LIMIT 20");
    const recentRegs = await db.all("SELECT username, 'Registered' as action, created_at as time, 0 as value FROM users WHERE created_at IS NOT NULL ORDER BY created_at DESC LIMIT 20");
    
    let activity = [...recentScores, ...recentLogins, ...recentRegs]
      .map(item => ({
        ...item,
        time: item.time ? Number(item.time) : 0
      }))
      .sort((a,b) => b.time - a.time)
      .slice(0, 20);
      
    return res.status(200).json({
      stats: { 
        totalUsers, 
        totalGamesPlayed: totalEndlessGames, 
        totalEndlessGames, 
        totalNormalGames, 
        dbSize, 
        uptime,
        keyboardGames,
        gestureGames
      },
      activity
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to load stats' });
  }
});

// Force logout user (admin only)
router.post('/force-logout', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'User ID required' });
    const db = getDb();
    await db.run('UPDATE users SET invalidate_before = ? WHERE id = ?', [Date.now(), userId]);
    return res.status(200).json({ success: true, message: 'User forced to logout on next request' });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// Ban/unban user (admin only)
router.post('/ban', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { userId, banned, reason } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }
    
    if (parseInt(userId) === req.user.id) {
      return res.status(400).json({ error: 'Cannot ban yourself' });
    }
    const db = getDb();
    const targetUser = await db.get('SELECT is_admin FROM users WHERE id = ?', [userId]);
    if (targetUser && targetUser.is_admin) {
      return res.status(403).json({ error: 'Cannot ban an admin account' });
    }
    
    await db.run(
      'UPDATE users SET banned = ?, ban_reason = ?, ban_appeal = CASE WHEN ? = 0 THEN NULL ELSE ban_appeal END WHERE id = ?',
      [banned ? 1 : 0, reason || null, banned ? 1 : 0, userId]
    );
    
    return res.status(200).json({ 
      success: true, 
      message: banned ? 'User banned' : 'User unbanned',
      userId 
    });
  } catch (err) {
    console.error('Admin ban error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset user progress (admin only)
router.post('/reset-progress', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }
    
    const db = getDb();
    const targetUser = await db.get('SELECT is_admin FROM users WHERE id = ?', [userId]);
    if (targetUser && targetUser.is_admin && parseInt(userId) !== req.user.id) {
      return res.status(403).json({ error: 'Cannot reset another admin\'s progress' });
    }

    await db.run('UPDATE users SET game_data = NULL WHERE id = ?', [userId]);
    
    return res.status(200).json({ 
      success: true, 
      message: 'User progress reset',
      userId 
    });
  } catch (err) {
    console.error('Admin reset error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get leaderboard with cheat scores (admin only)
router.get('/leaderboard', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const endlessScores = await db.all('SELECT s.id, s.user_id, s.username, s.chapter_id, s.score, s.waves_survived, s.survival_seconds, s.control_type, s.created_at, u.banned, u.cheat_score FROM inf_scores s JOIN users u ON s.user_id = u.id ORDER BY s.waves_survived DESC, s.score DESC');

    const flaggedEndless = endlessScores.map(s => {
      let suspicious = s.cheat_score > 50;
      if (s.score > 500000) suspicious = true;
      if (s.waves_survived > 10000) suspicious = true;
      return { ...s, type: 'endless', suspicious };
    });

    return res.status(200).json({ leaderboard: { endless: flaggedEndless } });
  } catch (err) {
    console.error('Admin leaderboard error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete score (admin only)
router.delete('/delete-score', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.body;
    const db = getDb();
    await db.run('DELETE FROM inf_scores WHERE id = ?', [id]);
    return res.status(200).json({ success: true, message: 'Score deleted' });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// Mark suspicious user (admin only)
router.post('/mark-cheat', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { userId, cheatScore, reason } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }
    
    const db = getDb();
    const MAX_CHEAT_SCORE = 999;
    await db.run(
      'UPDATE users SET cheat_score = LEAST(cheat_score + ?, ?), ban_reason = COALESCE(ban_reason, ?) WHERE id = ?',
      [cheatScore || 10, MAX_CHEAT_SCORE, reason || 'Suspicious activity', userId]
    );

    return res.status(200).json({ success: true, message: 'User marked' });
  } catch (err) {
    console.error('Admin mark cheat error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset cheat score (admin only)
router.post('/reset-cheat', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'User ID required' });
    const db = getDb();
    await db.run('UPDATE users SET cheat_score = 0, ban_reason = NULL WHERE id = ?', [userId]);
    return res.status(200).json({ success: true, message: 'Cheat score cleared' });
  } catch (err) {
    console.error('Admin reset cheat error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Issue test-mode token (admin only)
router.post('/test-token', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { mode, chapterId, invincible, oneHitKill, attackId } = req.body;
    const payload = { mode, chapterId, invincible, oneHitKill, attackId };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '30s' });
    return res.status(200).json({ token });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify test-mode token (admin only)
router.post('/verify-test-token', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ valid: false, error: 'No token provided' });
    const settings = jwt.verify(token, JWT_SECRET);
    return res.status(200).json({ valid: true, settings });
  } catch (err) {
    return res.status(400).json({ valid: false, error: 'Invalid or expired token' });
  }
});

// Delete user account (admin only)
router.delete('/delete-user', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    if (parseInt(userId) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account from admin panel' });
    }

    const db = getDb();
    const target = await db.get('SELECT id, username, is_admin FROM users WHERE id = ?', [userId]);
    if (!target) return res.status(404).json({ error: 'User not found' });

    if (target.is_admin) {
      return res.status(403).json({ error: 'Cannot delete another admin account' });
    }

    await db.run('DELETE FROM users WHERE id = ?', [userId]);
    return res.status(200).json({ success: true, message: `User ${target.username} deleted` });
  } catch (err) {
    console.error('Admin delete user error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
