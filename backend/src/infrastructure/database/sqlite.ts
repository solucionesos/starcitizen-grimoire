import Database, { type Database as DatabaseType } from 'better-sqlite3';
import path from 'node:path';
import fs from 'fs-extra';

const dbDir = path.join(process.cwd(), 'data');
const dbPath = process.env.SQLITE_DB_PATH || path.join(dbDir, 'ancalagon.sqlite');
fs.ensureDirSync(path.dirname(dbPath));

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
      expected_discord_username TEXT,
      is_discord_linked INTEGER NOT NULL DEFAULT 0,
      home_system TEXT NOT NULL DEFAULT 'Pyro',
      combat_role TEXT NOT NULL DEFAULT 'Vanguardia',
      approved_by TEXT,
      approved_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS member_ships (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      ship_id TEXT NOT NULL,
      ship_name TEXT NOT NULL,
      manufacturer TEXT NOT NULL DEFAULT 'Desconocido',
      ship_class TEXT NOT NULL DEFAULT 'Nave',
      callsign TEXT,
      status TEXT NOT NULL DEFAULT 'operativa', -- 'operativa' | 'en_forja' | 'reserva'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_member_ships_user_id ON member_ships(user_id);
    CREATE INDEX IF NOT EXISTS idx_member_ships_status ON member_ships(status);

    CREATE TABLE IF NOT EXISTS abyssal_marks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      reason TEXT NOT NULL,
      awarded_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (awarded_by) REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_abyssal_marks_user_id ON abyssal_marks(user_id);

    CREATE TABLE IF NOT EXISTS council_audit_log (
      id TEXT PRIMARY KEY,
      actor_id TEXT,
      action_type TEXT NOT NULL,
      target_user_id TEXT,
      details TEXT NOT NULL DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
    CREATE INDEX IF NOT EXISTS idx_council_audit_created_at ON council_audit_log(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_council_audit_actor ON council_audit_log(actor_id);
    CREATE INDEX IF NOT EXISTS idx_council_audit_target ON council_audit_log(target_user_id);
    CREATE INDEX IF NOT EXISTS idx_council_audit_action ON council_audit_log(action_type);

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
      member_ship_id TEXT REFERENCES member_ships(id) ON DELETE SET NULL,
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

  // Idempotent column migrations for existing SQLite databases
  const userCols = new Set(
    (db.pragma('table_info(users)') as Array<{ name: string }>).map((c) => c.name)
  );
  if (!userCols.has('expected_discord_username')) {
    db.exec('ALTER TABLE users ADD COLUMN expected_discord_username TEXT');
  }
  if (!userCols.has('is_discord_linked')) {
    db.exec('ALTER TABLE users ADD COLUMN is_discord_linked INTEGER NOT NULL DEFAULT 0');
  }
  if (!userCols.has('home_system')) {
    db.exec("ALTER TABLE users ADD COLUMN home_system TEXT NOT NULL DEFAULT 'Pyro'");
  }
  if (!userCols.has('combat_role')) {
    db.exec("ALTER TABLE users ADD COLUMN combat_role TEXT NOT NULL DEFAULT 'Vanguardia'");
  }

  // Idempotent backfill for real Discord accounts (never overwrites roster_* or org_* placeholders)
  db.exec(`
    UPDATE users
    SET is_discord_linked = 1
    WHERE is_discord_linked = 0
      AND discord_id IS NOT NULL
      AND discord_id NOT LIKE 'roster_%'
      AND discord_id NOT LIKE 'org_%'
      AND discord_id NOT LIKE 'ancalagon_%'
      AND discord_id NOT LIKE '10000000000000000%'
  `);

  const signupCols = new Set(
    (db.pragma('table_info(crusade_signups)') as Array<{ name: string }>).map((c) => c.name)
  );
  if (!signupCols.has('member_ship_id')) {
    db.exec(
      'ALTER TABLE crusade_signups ADD COLUMN member_ship_id TEXT REFERENCES member_ships(id) ON DELETE SET NULL'
    );
  }

  // Ensure Quaker (Heraldo) has 'admin' role
  db.exec(`
    UPDATE users
    SET role = 'admin',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = 'usr-quaker-heraldo'
      AND role != 'admin';
  `);

  console.log('[SQLite] Base de datos de la Hermandad inicializada en:', dbPath);
}
