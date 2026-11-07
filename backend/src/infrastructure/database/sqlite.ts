import Database, { type Database as DatabaseType } from 'better-sqlite3';
import path from 'node:path';
import fs from 'fs-extra';

const dbDir = path.join(process.cwd(), 'data');
fs.ensureDirSync(dbDir);

const dbPath = path.join(dbDir, 'ancalagon.sqlite');
export const db: DatabaseType = new Database(dbPath);

// Enable WAL mode for optimal concurrent reads and writes
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      discord_id TEXT UNIQUE NOT NULL,
      discord_username TEXT NOT NULL,
      discord_discriminator TEXT,
      discord_avatar TEXT,
      rsi_handle TEXT,
      display_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected' | 'suspended'
      role TEXT NOT NULL DEFAULT 'neofito',   -- 'visitante' | 'neofito' | 'hermano' | 'oficial' | 'consejo' | 'admin'
      rank_id TEXT NOT NULL DEFAULT 'neofito',
      rank_level INTEGER NOT NULL DEFAULT 0,
      cargo TEXT NOT NULL DEFAULT 'Iniciado',
      specialties TEXT DEFAULT '[]',          -- JSON array
      bio TEXT,
      approved_by TEXT,
      approved_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS altars (
      user_id TEXT PRIMARY KEY,
      items TEXT NOT NULL DEFAULT '[]',       -- JSON array of cart items
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS objectives (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      scope TEXT NOT NULL DEFAULT 'org',      -- 'individual' | 'cargo' | 'org'
      status TEXT NOT NULL DEFAULT 'activo',  -- 'propuesto' | 'activo' | 'en_progreso' | 'cumplido' | 'abandonado'
      progress INTEGER NOT NULL DEFAULT 0,
      creator_id TEXT NOT NULL,
      assigned_to TEXT,
      category TEXT DEFAULT 'general',        -- 'recoleccion' | 'combate' | 'ascenso' | 'forja' | 'general'
      due_date DATETIME,
      linked_mandate_id TEXT,
      linked_recipe_id TEXT,
      verified_by TEXT,
      verified_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (creator_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS crusades (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      briefing TEXT,
      operation_date DATETIME NOT NULL,
      location TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'convocada', -- 'convocada' | 'en_curso' | 'victoriosa' | 'archivada'
      creator_id TEXT NOT NULL,
      ships_required TEXT DEFAULT '[]',        -- JSON array
      max_brothers INTEGER DEFAULT 16,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (creator_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS crusade_signups (
      id TEXT PRIMARY KEY,
      crusade_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      ship_brought TEXT,
      role_assigned TEXT DEFAULT 'Operativo',
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(crusade_id, user_id),
      FOREIGN KEY (crusade_id) REFERENCES crusades(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS polls (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      poll_type TEXT NOT NULL,               -- 'cruzada' | 'convocatoria' | 'designio' | 'libre'
      status TEXT NOT NULL DEFAULT 'open',   -- 'open' | 'closed'
      opens_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      closes_at DATETIME NOT NULL,
      creator_id TEXT NOT NULL,
      min_rank_level INTEGER DEFAULT 1,     -- 1: Sombras del Umbral o superior
      winner_option_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (creator_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS poll_options (
      id TEXT PRIMARY KEY,
      poll_id TEXT NOT NULL,
      label TEXT NOT NULL,
      description TEXT,
      metadata TEXT,                         -- JSON string for mission_id, date, etc.
      FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS votes (
      id TEXT PRIMARY KEY,
      poll_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      option_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(poll_id, user_id),
      FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (option_id) REFERENCES poll_options(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS verdicts (
      id TEXT PRIMARY KEY,
      poll_id TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      poll_type TEXT NOT NULL,
      winner_label TEXT NOT NULL,
      total_votes INTEGER NOT NULL,
      summary TEXT NOT NULL,
      action_taken TEXT,
      closed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      featured_in_home INTEGER DEFAULT 1,
      FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE
    );
  `);

  console.log('[SQLite] Base de datos de la Hermandad inicializada en:', dbPath);
}
