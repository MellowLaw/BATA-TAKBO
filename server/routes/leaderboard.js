import express from 'express';
import crypto from 'crypto';
import { getDb } from '../db.js';
import { authMiddleware } from '../helpers.js';

const router = express.Router();

// Start endless mode game session
router.post('/start-endless', authMiddleware, async (req, res) => {
  try {
    const { chapterId } = req.body;
    if (!chapterId || ![1, 2, 3].includes(Number(chapterId))) {
      return res.status(400).json({ error: 'Invalid or missing chapterId' });
    }

    const db = getDb();
    
    // Prune expired sessions older than 24 hours or already used of this user
    const pruneTime = Date.now() - 24 * 60 * 60 * 1000;
    await db.run('DELETE FROM game_sessions WHERE user_id = ? AND (used = TRUE OR created_at < ?)', [req.user.id, pruneTime]);

    // Generate new sessionId
    const sessionId = crypto.randomUUID();
    const now = Date.now();

    await db.run(
      'INSERT INTO game_sessions (id, user_id, chapter_id, start_time, used, created_at) VALUES (?, ?, ?, ?, FALSE, ?)',
      [sessionId, req.user.id, Number(chapterId), now, now]
    );

    return res.status(200).json({ success: true, sessionId });
  } catch (err) {
    console.error('Start endless session error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit Endless Mode score (registered users only)
router.post('/endless', authMiddleware, async (req, res) => {
  try {
    const { chapterId, score, wavesSurvived, survivalSeconds, controlType, sessionId } = req.body;
    if (!chapterId || score == null || !controlType) return res.status(400).json({ error: 'Missing required fields' });
    if (![1, 2, 3].includes(Number(chapterId))) return res.status(400).json({ error: 'Invalid chapterId' });
    if (!['gesture', 'keyboard'].includes(controlType)) return res.status(400).json({ error: 'Invalid controlType' });
    if (typeof score !== 'number' || score < 0 || score > 99999999) return res.status(400).json({ error: 'Invalid score' });

    const db = getDb();
    const user = await db.get('SELECT username, banned, is_admin, cheat_score FROM users WHERE id = ?', [req.user.id]);
    if (!user || user.banned) return res.status(403).json({ error: 'Forbidden' });
    if (user.is_admin) return res.status(403).json({ error: 'Admin accounts cannot submit scores' });

    let cheatScoreDelta = 0;
    const reasons = [];

    // --- 1. Session Verification ---
    if (!sessionId) {
      cheatScoreDelta += 40;
      reasons.push('Score submitted without sessionId');
    } else {
      const session = await db.get('SELECT * FROM game_sessions WHERE id = ? AND user_id = ?', [sessionId, req.user.id]);
      if (!session) {
        cheatScoreDelta += 50;
        reasons.push('No matching game session found');
      } else if (session.used) {
        cheatScoreDelta += 60;
        reasons.push('Reused game session token');
      } else if (Number(session.chapter_id) !== Number(chapterId)) {
        cheatScoreDelta += 30;
        reasons.push(`Session chapterId (${session.chapter_id}) mismatch with submitted chapterId (${chapterId})`);
      } else {
        // Mark session as used
        await db.run('UPDATE game_sessions SET used = TRUE WHERE id = ?', [sessionId]);

        // Verify elapsed time vs survivalSeconds
        const elapsedSecs = (Date.now() - Number(session.start_time)) / 1000;
        const survSecs = Number(survivalSeconds) || 0;
        if (survSecs > elapsedSecs + 15) { // 15-second buffer for latency/loading/pause
          cheatScoreDelta += 50;
          reasons.push(`Impossible survival time: claimed ${survSecs}s but only ${Math.round(elapsedSecs)}s elapsed`);
        }
      }
    }

    // --- 2. Statistical Anomaly Detection ---
    const survSecs = Number(survivalSeconds) || 0;
    const waves = Number(wavesSurvived) || 0;

    // A. Wave Speed (physically impossible to survive waves quicker than 3 seconds per wave on average)
    if (waves > 5 && survSecs / waves < 3.0) {
      cheatScoreDelta += 40;
      reasons.push(`Impossible wave rate: survived ${waves} waves in ${survSecs}s (${(survSecs/waves).toFixed(2)}s/wave)`);
    }

    // B. Score Rate (impossible to accumulate more than 6,000 points per second of play)
    if (survSecs > 5 && score / survSecs > 6000) {
      cheatScoreDelta += 50;
      reasons.push(`Impossible score accumulation rate: ${score} points in ${survSecs}s (${(score/survSecs).toFixed(2)} pts/s)`);
    }

    // C. Extreme limit bounds check
    if (score > 5000000) {
      cheatScoreDelta += 100;
      reasons.push(`Score exceeds extreme threshold (5M): ${score}`);
    }
    if (waves > 500) {
      cheatScoreDelta += 100;
      reasons.push(`Waves survived exceeds extreme threshold (500): ${waves}`);
    }

    // --- 3. Process Anti-Cheat Flags & Potential Auto-Ban ---
    let finalBanned = false;
    if (cheatScoreDelta > 0) {
      const newCheatScore = Math.min((user.cheat_score || 0) + cheatScoreDelta, 999);
      console.warn(`[ANTI-CHEAT] Suspicious activity flagged for user ${user.username} (ID: ${req.user.id}). Delta: +${cheatScoreDelta}, New Cheat Score: ${newCheatScore}. Reasons: ${reasons.join(' | ')}`);
      
      const banReason = `Automated Anti-Cheat trigger: ${reasons.join(', ')}`;
      if (newCheatScore >= 100) {
        finalBanned = true;
        await db.run(
          'UPDATE users SET cheat_score = ?, banned = TRUE, ban_reason = ? WHERE id = ?',
          [newCheatScore, banReason, req.user.id]
        );
        console.warn(`[ANTI-CHEAT] Auto-banned user ${user.username} (ID: ${req.user.id}) due to cheat score >= 100.`);
      } else {
        await db.run(
          'UPDATE users SET cheat_score = ?, ban_reason = COALESCE(ban_reason, ?) WHERE id = ?',
          [newCheatScore, banReason, req.user.id]
        );
      }
    }

    // Insert score regardless, so the admin sees the cheat attempt in the database/admin dashboard!
    // But if auto-banned or flagged as suspicious, they are excluded from the public leaderboard ranking anyway (thanks to u.banned = FALSE filter)
    await db.run(
      'INSERT INTO inf_scores (user_id, username, chapter_id, score, waves_survived, survival_seconds, control_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, user.username, Number(chapterId), Math.floor(score), Math.floor(wavesSurvived) || 0, Math.floor(survivalSeconds) || 0, controlType, Date.now()]
    );

    // If banned, return decoy success response but skip the leaderboard ranking query
    if (finalBanned) {
      return res.status(200).json({
        success: true,
        wavesRank: null,
        scoreRank: null,
        bestRank: null,
        banned: true
      });
    }

    // Calculate user's best rank for waves leaderboard
    const wavesRankRow = await db.get(`
      SELECT ranked_rank FROM (
        SELECT username,
               ROW_NUMBER() OVER (
                 ORDER BY waves_survived DESC, survival_seconds ASC, score DESC
               ) AS ranked_rank
        FROM (
          SELECT i.user_id, i.username,
                 i.waves_survived, i.score, i.survival_seconds,
                 ROW_NUMBER() OVER (
                   PARTITION BY i.user_id
                   ORDER BY i.waves_survived DESC, i.survival_seconds ASC, i.score DESC
                 ) AS rn
          FROM inf_scores i
          INNER JOIN users u ON i.user_id = u.id
          WHERE i.chapter_id = ? AND i.control_type = ?
            AND u.banned = FALSE AND u.is_admin = FALSE
        ) ranked
        WHERE rn = 1
      ) final
      WHERE username = ?
    `, [Number(chapterId), controlType, user.username]);

    // Calculate user's best rank for score leaderboard
    const scoreRankRow = await db.get(`
      SELECT ranked_rank FROM (
        SELECT username,
               ROW_NUMBER() OVER (
                 ORDER BY score DESC, waves_survived DESC, survival_seconds ASC
               ) AS ranked_rank
        FROM (
          SELECT i.user_id, i.username,
                 i.waves_survived, i.score, i.survival_seconds,
                 ROW_NUMBER() OVER (
                   PARTITION BY i.user_id
                   ORDER BY i.score DESC, i.waves_survived DESC, i.survival_seconds ASC
                 ) AS rn
          FROM inf_scores i
          INNER JOIN users u ON i.user_id = u.id
          WHERE i.chapter_id = ? AND i.control_type = ?
            AND u.banned = FALSE AND u.is_admin = FALSE
        ) ranked
        WHERE rn = 1
      ) final
      WHERE username = ?
    `, [Number(chapterId), controlType, user.username]);

    const wavesRank = wavesRankRow ? wavesRankRow.ranked_rank : null;
    const scoreRank = scoreRankRow ? scoreRankRow.ranked_rank : null;
    const bestRank = Math.min(
      wavesRank || Infinity,
      scoreRank || Infinity
    );

    return res.status(200).json({
      success: true,
      wavesRank,
      scoreRank,
      bestRank: bestRank === Infinity ? null : bestRank
    });
  } catch (err) {
    console.error('Endless score submit error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

const leaderboardCache = new Map();
const CACHE_TTL = 30 * 1000; // 30-second in-memory cache to handle concurrent load spikes

// Get Endless Mode leaderboard
router.get('/endless', async (req, res) => {
  try {
    const { chapterId, controlType, sortBy } = req.query;
    if (!chapterId || ![1, 2, 3].includes(Number(chapterId))) return res.status(400).json({ error: 'Invalid or missing chapterId' });
    if (!controlType || !['gesture', 'keyboard'].includes(controlType)) return res.status(400).json({ error: 'Invalid or missing controlType' });

    const mode = sortBy === 'score' ? 'score' : 'waves';
    const cacheKey = `${chapterId}_${controlType}_${mode}`;
    const cached = leaderboardCache.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      return res.status(200).json({ entries: cached.data, sortBy: mode, cached: true });
    }

    const innerOrder = mode === 'score'
      ? 'i.score DESC, i.waves_survived DESC, i.survival_seconds ASC'
      : 'i.waves_survived DESC, i.survival_seconds ASC, i.score DESC';
    const outerOrder = mode === 'score'
      ? 'score DESC, waves_survived DESC, survival_seconds ASC'
      : 'waves_survived DESC, survival_seconds ASC, score DESC';

    const db = getDb();
    const rows = await db.all(`
      SELECT username, waves_survived, score, survival_seconds, avatar_url
      FROM (
        SELECT i.user_id, i.username,
               i.waves_survived, i.score, i.survival_seconds,
               u.avatar_url,
               ROW_NUMBER() OVER (
                 PARTITION BY i.user_id
                 ORDER BY ${innerOrder}
               ) AS rn
        FROM inf_scores i
        INNER JOIN users u ON i.user_id = u.id
        WHERE i.chapter_id = ? AND i.control_type = ?
          AND u.banned = FALSE AND u.is_admin = FALSE
      ) ranked
      WHERE rn = 1
      ORDER BY ${outerOrder}
      LIMIT 20
    `, [Number(chapterId), controlType]);

    leaderboardCache.set(cacheKey, {
      timestamp: Date.now(),
      data: rows
    });

    return res.status(200).json({ entries: rows, sortBy: mode });
  } catch (err) {
    console.error('Endless leaderboard fetch error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user's rank and stats for a specific chapter/control (auth required)
router.get('/my-rank', authMiddleware, async (req, res) => {
  try {
    const { chapterId, controlType, sortBy } = req.query;
    if (!chapterId || ![1, 2, 3].includes(Number(chapterId))) return res.status(400).json({ error: 'Invalid or missing chapterId' });
    if (!controlType || !['gesture', 'keyboard'].includes(controlType)) return res.status(400).json({ error: 'Invalid or missing controlType' });

    const mode = sortBy === 'score' ? 'score' : 'waves';
    const innerOrder = mode === 'score'
      ? 'i.score DESC, i.waves_survived DESC, i.survival_seconds ASC'
      : 'i.waves_survived DESC, i.survival_seconds ASC, i.score DESC';
    const outerOrder = mode === 'score'
      ? 'score DESC, waves_survived DESC, survival_seconds ASC'
      : 'waves_survived DESC, survival_seconds ASC, score DESC';

    const db = getDb();
    const userBestRun = await db.get(`
      SELECT waves_survived, score, survival_seconds, avatar_url
      FROM (
        SELECT i.waves_survived, i.score, i.survival_seconds,
               u.avatar_url,
               ROW_NUMBER() OVER (
                 PARTITION BY i.user_id
                 ORDER BY ${innerOrder}
               ) AS rn
        FROM inf_scores i
        INNER JOIN users u ON i.user_id = u.id
        WHERE i.chapter_id = ? AND i.control_type = ?
          AND i.user_id = ?
          AND u.banned = FALSE
      ) ranked
      WHERE rn = 1
    `, [Number(chapterId), controlType, req.user.id]);

    if (!userBestRun) {
      return res.status(200).json({ hasRecord: false });
    }

    const rankRow = await db.get(`
      SELECT ranked_rank FROM (
        SELECT username,
               ROW_NUMBER() OVER (
                 ORDER BY ${outerOrder}
               ) AS ranked_rank
        FROM (
          SELECT i.user_id, i.username,
                 i.waves_survived, i.score, i.survival_seconds,
                 ROW_NUMBER() OVER (
                   PARTITION BY i.user_id
                   ORDER BY ${innerOrder}
                 ) AS rn
          FROM inf_scores i
          INNER JOIN users u ON i.user_id = u.id
          WHERE i.chapter_id = ? AND i.control_type = ?
            AND u.banned = FALSE AND u.is_admin = FALSE
        ) ranked
        WHERE rn = 1
      ) final
      WHERE username = (SELECT username FROM users WHERE id = ?)
    `, [Number(chapterId), controlType, req.user.id]);

    const rank = rankRow ? rankRow.ranked_rank : null;
    const totalPlayers = (await db.get(`
      SELECT COUNT(DISTINCT user_id) as count
      FROM inf_scores i
      INNER JOIN users u ON i.user_id = u.id
      WHERE i.chapter_id = ? AND i.control_type = ?
        AND u.banned = FALSE AND u.is_admin = FALSE
    `, [Number(chapterId), controlType])).count;

    return res.status(200).json({
      hasRecord: true,
      rank,
      totalPlayers,
      wavesSurvived: userBestRun.waves_survived,
      score: userBestRun.score,
      survivalSeconds: userBestRun.survival_seconds,
      avatarUrl: userBestRun.avatar_url
    });
  } catch (err) {
    console.error('My rank fetch error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Guest score cleanup placeholder
router.delete('/guest-scores', (req, res) => {
  return res.status(200).json({ success: true });
});

export default router;
