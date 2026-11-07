import { db } from './sqlite.js';

export function seedDatabase() {
  // 1. Mantener únicamente el Registro Oficial de Miembros de la Flota (Codex Oblivionis Parte X)
  // Cuando inicien sesión por Discord en producción, su discord_id real se vinculará automáticamente a su perfil canónico.
  const upsertUser = db.prepare(`
    INSERT INTO users (
      id, discord_id, discord_username, rsi_handle, display_name,
      status, role, rank_id, rank_level, cargo, specialties, bio
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      display_name = excluded.display_name,
      rsi_handle = excluded.rsi_handle,
      role = excluded.role,
      rank_id = excluded.rank_id,
      rank_level = excluded.rank_level,
      cargo = excluded.cargo,
      specialties = excluded.specialties,
      bio = excluded.bio
  `);

  const officialRoster = [
    [
      'usr-quaker-heraldo',
      'roster_quaker',
      'quaker',
      'Quaker',
      'Quaker',
      'approved',
      'consejo',
      'heraldo',
      6,
      'La Voz del Dragón',
      JSON.stringify(['Voluntad del Dragón Negro', 'Juicio Final', 'Mando Supremo']),
      'La cúspide de la Escala del Abismo. Quien interpreta la voluntad del Dragón Negro y guía a toda la flota hacia su destino final.',
    ],
    [
      'usr-enanimus-profeta',
      'roster_enanimus',
      'enanimus',
      'Enanimus',
      'Enanimus',
      'approved',
      'consejo',
      'profetas',
      5,
      'El Estratega Oscuro — Concilio del Vacío',
      JSON.stringify(['Arquitectura de Campañas', 'Códice Sagrado', 'Edictos de Sangre']),
      'Profeta de la Ruina e integrante del Concilio del Vacío. Arquitecto de las grandes campañas y guardián del Códice Sagrado.',
    ],
    [
      'usr-denoxx-profeta',
      'roster_denoxx',
      'denoxx',
      'Denoxx',
      'Denoxx',
      'approved',
      'consejo',
      'profetas',
      5,
      'El Estratega Oscuro — Concilio del Vacío',
      JSON.stringify(['Guerra Asimétrica', 'Doctrina del Vacío', 'Juicio de la Fe']),
      'Profeta de la Ruina e integrante del Concilio del Vacío. Juez implacable de la fe y estratega de la aniquilación en Pyro y Nyx.',
    ],
    [
      'usr-longhinus-profeta',
      'roster_longhinus',
      'longhinus',
      'Longhinus',
      'Longhinus',
      'approved',
      'consejo',
      'profetas',
      5,
      'El Estratega Oscuro — Concilio del Vacío',
      JSON.stringify(['Asedio Capital', 'Logística de Guerra', 'Forja Abisal']),
      'Profeta de la Ruina e integrante del Concilio del Vacío. Custodio de las Bóvedas de Ceniza y maestro del asedio orbital.',
    ],
    [
      'usr-afol86-voz',
      'roster_afol86',
      'afol86',
      'Afol86',
      'Afol86',
      'approved',
      'oficial',
      'voces',
      4,
      'El Filósofo-Guerrero — Comandante de Escuadrón',
      JSON.stringify(['Mando de Escuadrón', 'Doctrina de Combate', 'Mentoría del Umbral']),
      'Voz del Abismo. Comandante de escuadrón y maestro de doctrina que habla con la autoridad gélida del Vacío.',
    ],
    [
      'usr-unknown-portador',
      'roster_unknown_t20',
      'unknown-t20',
      'Unknown-t20',
      'Unknown-t20',
      'approved',
      'hermano',
      'portadores',
      3,
      'El Veterano Silencioso — Vanguardia de Ceniza',
      JSON.stringify(['Operaciones de Asalto', 'Extracción en Fisuras', 'Supervivencia']),
      'Portador de Ceniza probado en fuego y silencio. Lleva las cicatrices del Vacío como columna vertebral de la flota.',
    ],
    [
      'usr-kannabistian-iniciado',
      'roster_kannabistian420',
      'kannabistian420',
      'Kannabistian420',
      'Kannabistian420',
      'approved',
      'hermano',
      'iniciados',
      2,
      'El Converso — Operativo de Línea',
      JSON.stringify(['Recolección de Ofrendas', 'Reconocimiento', 'Escolta']),
      'Iniciado del Vacío que ha superado el Ritual de Iniciación y jurado lealtad eterna al Abismo.',
    ],
  ];

  for (const u of officialRoster) {
    upsertUser.run(...u);
  }

  // 2. Purgar cualquier dato de prueba o semilla previo para que el sistema esté completamente limpio
  // (Solo se conservarán las Votaciones, Designios y Cruzadas reales que el Concilio o el Oráculo creen explícitamente)
  db.prepare("DELETE FROM verdicts WHERE id = 'verdict-seed-001' OR poll_id IN ('poll-001', 'poll-closed-001')").run();
  db.prepare("DELETE FROM votes WHERE poll_id IN ('poll-001', 'poll-closed-001')").run();
  db.prepare("DELETE FROM poll_options WHERE poll_id IN ('poll-001', 'poll-closed-001')").run();
  db.prepare("DELETE FROM polls WHERE id IN ('poll-001', 'poll-closed-001')").run();
  db.prepare("DELETE FROM crusade_signups WHERE crusade_id = 'crusade-001'").run();
  db.prepare("DELETE FROM crusades WHERE id = 'crusade-001'").run();
  db.prepare("DELETE FROM objectives WHERE id IN ('obj-001', 'obj-002', 'obj-003')").run();
  db.prepare("DELETE FROM users WHERE id IN ('dev-consejo-001', 'dev-hermano-001', 'dev-neofito-001', 'usr-candidato-umbral')").run();

  console.log('[SQLite] Sistema inicializado limpio y sin datos de prueba (Roster Oficial activo).');
}

export const seedInitialData = seedDatabase;
