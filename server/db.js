import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

// ─── Thin compatibility wrapper ──────────────────────────────────────────────
// server.js uses db.get / db.all / db.run / db.exec — we map those to pg Pool.
// pg uses $1/$2/... placeholders; server.js uses ?/? — we convert automatically.
function convertPlaceholders(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

function makeDb(pool) {
  return {
    // Returns the first row or undefined
    async get(sql, params = []) {
      const { rows } = await pool.query(convertPlaceholders(sql), params);
      return rows[0];
    },
    // Returns all rows
    async all(sql, params = []) {
      const { rows } = await pool.query(convertPlaceholders(sql), params);
      return rows;
    },
    // INSERT / UPDATE / DELETE — returns { lastID, changes }
    async run(sql, params = []) {
      const converted = convertPlaceholders(sql);
      // For INSERTs we append RETURNING id so we get lastID back (only for tables with an 'id' column)
      const isInsert = /^\s*INSERT/i.test(sql);
      const lowerSql = sql.toLowerCase();
      const hasIdColumn = isInsert && (lowerSql.includes('users') || lowerSql.includes('inf_scores'));
      const finalSql = hasIdColumn && !/RETURNING/i.test(sql) ? `${converted} RETURNING id` : converted;
      const { rows, rowCount } = await pool.query(finalSql, params);
      return { lastID: rows[0]?.id ?? null, changes: rowCount };
    },
    // DDL statements (CREATE TABLE, ALTER TABLE, etc.)
    async exec(sql) {
      await pool.query(sql);
    },
    // Raw pool access for transactions
    pool,
  };
}

export let dbInstance = null;

export function getDb() {
  if (!dbInstance) {
    throw new Error('Database has not been initialized yet. Call initDb() first.');
  }
  return dbInstance;
}

export async function initDb() {
  // Pool is created here — AFTER dotenv.config() has already run in server.js
  const isRemoteDb = process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost') && !process.env.DATABASE_URL.includes('127.0.0.1');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isRemoteDb ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  pool.on('error', (err) => {
    console.error('[DB] Unexpected pool error:', err.message);
  });

  const db = makeDb(pool);
  dbInstance = db;
  // ─── Create tables ────────────────────────────────────────────────────────
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id               SERIAL PRIMARY KEY,
      username         TEXT UNIQUE NOT NULL,
      email            TEXT UNIQUE,
      password_hash    TEXT NOT NULL,
      encrypted_data   TEXT,
      game_data        TEXT,
      failed_attempts  INTEGER NOT NULL DEFAULT 0,
      lockout_time     BIGINT NOT NULL DEFAULT 0,
      is_admin         BOOLEAN NOT NULL DEFAULT FALSE,
      banned           BOOLEAN NOT NULL DEFAULT FALSE,
      ban_reason       TEXT,
      ban_appeal       TEXT,
      cheat_score      REAL NOT NULL DEFAULT 0,
      last_login       BIGINT,
      reset_token      TEXT,
      reset_token_expiry BIGINT,
      username_changed_at BIGINT,
      invalidate_before   BIGINT,
      created_at          BIGINT,
      avatar_url          TEXT
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS inf_scores (
      id               SERIAL PRIMARY KEY,
      user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      username         TEXT NOT NULL,
      chapter_id       INTEGER NOT NULL CHECK(chapter_id IN (1, 2, 3)),
      score            INTEGER NOT NULL,
      waves_survived   INTEGER NOT NULL DEFAULT 0,
      survival_seconds INTEGER NOT NULL DEFAULT 0,
      control_type     TEXT NOT NULL CHECK(control_type IN ('gesture', 'keyboard')),
      created_at       BIGINT NOT NULL
    )
  `);

  // Gesture models stored separately to keep users table lean (models can be several MB)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS user_gesture_models (
      user_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      model_data TEXT NOT NULL,
      updated_at BIGINT NOT NULL
    )
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS blacklisted_tokens (
      token      TEXT PRIMARY KEY,
      expires_at BIGINT NOT NULL
    )
  `);

  // ─── Indexes ──────────────────────────────────────────────────────────────
  // ─── Migrations ───────────────────────────────────────────────────────────
  await db.exec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT`);
  await db.exec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS push_subscription TEXT`);
  await db.exec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE`);
  await db.exec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_code TEXT`);
  await db.exec(`ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_code_expiry BIGINT`);

  // ─── Indexes ──────────────────────────────────────────────────────────────
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_users_username      ON users(LOWER(username))`);
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_users_email         ON users(LOWER(email))`);
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_inf_scores_user     ON inf_scores(user_id)`);
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_inf_scores_chapter  ON inf_scores(chapter_id, control_type, score DESC)`);

  // ─── Seed admin accounts from .env ────────────────────────────────────────
  try {
    const forceReseed = process.env.ADMIN_SEED_FORCE === 'true';
    if (forceReseed) {
      console.warn('[SEED] ⚠️  ADMIN_SEED_FORCE=true — will update existing admin credentials.');
      console.warn('[SEED]     Remember to set ADMIN_SEED_FORCE=false after restarting!');
    }

    // Remove legacy test accounts if still present
    for (const legacyUser of ['ADMIN', 'PLAYER1', 'TESTER']) {
      const legacy = await db.get('SELECT id FROM users WHERE LOWER(username) = LOWER(?)', [legacyUser]);
      if (legacy) {
        await db.run('DELETE FROM users WHERE id = ?', [legacy.id]);
        console.log(`[SEED] Removed legacy account: ${legacyUser}`);
      }
    }

    const fullUnlockData = JSON.stringify({
      tutorialComplete: true,
      gestureSetupComplete: true,
      chapterProgress: {
        chaptersUnlocked: [1, 2, 3],
        chaptersCompleted: [1, 2, 3],
        bestScores: {}
      }
    });

    for (let i = 1; i <= 3; i++) {
      const username = process.env[`ADMIN_SEED_${i}_USERNAME`];
      const email    = process.env[`ADMIN_SEED_${i}_EMAIL`];
      const password = process.env[`ADMIN_SEED_${i}_PASSWORD`];

      if (!username || !password) continue;

      const existing = await db.get('SELECT id, is_admin FROM users WHERE LOWER(username) = LOWER(?)', [username]);

      if (!existing) {
        const hash = await bcrypt.hash(password, 12);
        await db.run(
          'INSERT INTO users (username, email, password_hash, is_admin, game_data) VALUES (?, ?, ?, TRUE, ?)',
          [username, email || null, hash, fullUnlockData]
        );
        console.log(`[SEED] ✅ Created admin account: ${username}`);

      } else if (forceReseed) {
        const hash = await bcrypt.hash(password, 12);
        await db.run(
          'UPDATE users SET email = ?, password_hash = ?, is_admin = TRUE WHERE id = ?',
          [email || null, hash, existing.id]
        );
        console.log(`[SEED] 🔄 Updated admin credentials: ${username}`);

      } else if (!existing.is_admin) {
        await db.run('UPDATE users SET is_admin = TRUE WHERE id = ?', [existing.id]);
        console.log(`[SEED] ⬆️  Promoted to admin: ${username}`);

      } else {
        console.log(`[SEED] ✓ Admin already exists (skipped): ${username}`);
      }
    }
  } catch (e) {
    console.error('[SEED] Error seeding admin accounts:', e);
  }

  console.log('[DB] PostgreSQL tables ready.');
  return db;
}
