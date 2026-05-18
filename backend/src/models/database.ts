import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'app.db');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db: Database.Database = new Database(DB_PATH);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

function normalizeBookmarkUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const pathname = parsed.pathname.replace(/\/+$/, '');
    return `${hostname}${pathname}`;
  } catch {
    return rawUrl.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');
  }
}

// Initialize tables
export function initDatabase() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      is_admin INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Settings table (for global settings like registration enabled)
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // Workspaces table
  db.exec(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Bookmarks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS bookmarks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      normalized_url TEXT,
      description TEXT,
      icon TEXT,
      tags TEXT DEFAULT '[]',
      is_frequent INTEGER DEFAULT 0,
      frequent_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Lightweight migration: add normalized_url for fast deduplication.
  const bookmarkColumns = db.prepare('PRAGMA table_info(bookmarks)').all() as Array<{ name: string }>;
  const hasNormalizedUrl = bookmarkColumns.some((column) => column.name === 'normalized_url');
  if (!hasNormalizedUrl) {
    db.exec('ALTER TABLE bookmarks ADD COLUMN normalized_url TEXT');
  }

  // Backfill normalized_url for legacy rows.
  const rowsNeedingNormalization = db
    .prepare('SELECT id, url FROM bookmarks WHERE normalized_url IS NULL OR normalized_url = \'\'')
    .all() as Array<{ id: string; url: string }>;
  const updateNormalizedUrlStmt = db.prepare('UPDATE bookmarks SET normalized_url = ? WHERE id = ?');
  for (const row of rowsNeedingNormalization) {
    updateNormalizedUrlStmt.run(normalizeBookmarkUrl(row.url), row.id);
  }

  // Groups table (for organizing pinned cards in workspaces)
  db.exec(`
    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Pinned cards table (bookmarks pinned to workspaces, with optional group)
  db.exec(`
    CREATE TABLE IF NOT EXISTS pinned_cards (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL,
      bookmark_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      group_id TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
      FOREIGN KEY (bookmark_id) REFERENCES bookmarks(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL
    )
  `);

  // Sessions table (for multi-device sync)
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      device_name TEXT,
      device_info TEXT,
      tabs TEXT DEFAULT '[]',
      active_workspace_id TEXT,
      last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (active_workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL
    )
  `);

  // Data migration safety: remove duplicate normalized URLs before adding unique index.
  // Keep newest record by updated_at/created_at/id and delete older duplicates.
  const duplicateGroups = db
    .prepare(
      `
      SELECT user_id, normalized_url
      FROM bookmarks
      WHERE normalized_url IS NOT NULL AND normalized_url != ''
      GROUP BY user_id, normalized_url
      HAVING COUNT(1) > 1
      `
    )
    .all() as Array<{ user_id: string; normalized_url: string }>;

  const selectKeepStmt = db.prepare(
    `
    SELECT id
    FROM bookmarks
    WHERE user_id = ? AND normalized_url = ?
    ORDER BY datetime(updated_at) DESC, datetime(created_at) DESC, id DESC
    LIMIT 1
    `
  );
  const deleteDupStmt = db.prepare(
    'DELETE FROM bookmarks WHERE user_id = ? AND normalized_url = ? AND id != ?'
  );

  for (const dup of duplicateGroups) {
    const keep = selectKeepStmt.get(dup.user_id, dup.normalized_url) as { id: string } | undefined;
    if (!keep) continue;
    deleteDupStmt.run(dup.user_id, dup.normalized_url, keep.id);
  }

  // Indexes for hot paths.
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_bookmarks_user_normalized_url
    ON bookmarks(user_id, normalized_url)
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_bookmarks_user_updated_at
    ON bookmarks(user_id, updated_at DESC)
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_bookmarks_user_frequent
    ON bookmarks(user_id, is_frequent, frequent_order)
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_pinned_cards_workspace_group_sort
    ON pinned_cards(workspace_id, group_id, sort_order)
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_groups_workspace_sort
    ON groups(workspace_id, sort_order)
  `);

  // Let SQLite auto-checkpoint WAL periodically (~1000 pages, default is often similar but we set explicitly).
  db.pragma('wal_autocheckpoint = 1000');

  // Insert default admin user if not exists
  const defaultPassword = '$2a$10$qgzmuGjJSYZbCGn3DkTRJOCz4EH4cw5CyafluJDsgzXnvdoRuMlDq'; // @^dhIPdZtcVR@jrd
  const insertDefaultUser = db.prepare(`
    INSERT OR IGNORE INTO users (id, username, password, is_admin)
    VALUES ('admin', 'admin', ?, 1)
  `);
  insertDefaultUser.run(defaultPassword);

  // Insert default settings
  const insertDefaultSettings = db.prepare(`
    INSERT OR IGNORE INTO settings (key, value)
    VALUES ('registration_enabled', 'true')
  `);
  insertDefaultSettings.run();

  console.log('Database initialized successfully');
}

export function runWalCheckpoint(mode: 'PASSIVE' | 'FULL' | 'RESTART' | 'TRUNCATE' = 'PASSIVE') {
  try {
    db.pragma(`wal_checkpoint(${mode})`);
  } catch (error) {
    console.warn(`WAL checkpoint (${mode}) failed:`, error);
  }
}

export default db;
