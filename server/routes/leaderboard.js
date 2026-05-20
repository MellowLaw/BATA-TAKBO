import express from 'express';
import { getDb } from '../db.js';
import { authMiddleware } from '../helpers.js';

const router = express.Router();

// Submit Endless Mode score (registered users only)
router.post('/endless', authMiddleware, async (req, res) => {
  try {
    const { chapterId, score, wavesSurvived, survivalSeconds, controlType } = req.body;
    if (!chapterId || score == null || !controlType) return res.status(400).json({ error: 'Missing required fields' });
    if (![1, 2, 3].includes(Number(chapterId))) return res.status(400).json({ error: 'Invalid chapterId' });
    if (!['gesture', 'keyboard'].includes(controlType)) return res.status(400).json({ error: 'Invalid controlType' });
    if (typeof score !== 'number' || score < 0 || score > 99999999) return res.status(400).json({ error: 'Invalid score' });

    const db = getDb();
    const user = await db.get('SELECT username, banned, is_admin FROM users WHERE id = ?', [req.user.id]);
    if (!user || user.banned) return res.status(403).json({ error: 'Forbidden' });
    if (user.is_admin) return res.status(403).json({ error: 'Admin accounts cannot submit scores' });

    await db.run(
      'INSERT INTO inf_scores (user_id, username, chapter_id, score, waves_survived, survival_seconds, control_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, user.username, Number(chapterId), Math.floor(score), Math.floor(wavesSurvived) || 0, Math.floor(survivalSeconds) || 0, controlType, Date.now()]
    );

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
