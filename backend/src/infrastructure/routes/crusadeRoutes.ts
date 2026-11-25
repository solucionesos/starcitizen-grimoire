import { Router, Response } from 'express';
import {
  requireApproved,
  requireOfficerOrAbove,
  requireCouncil,
  verifySyncToken,
  AuthenticatedRequest,
} from '../auth/authMiddleware.js';
import { logCouncilAction } from '../auth/authService.js';
import { db } from '../database/sqlite.js';
import crypto from 'node:crypto';

export const crusadeRouter = Router();

const CLOSED_CRUSADE_STATUSES = ['victoriosa', 'completada', 'archivada', 'cancelada'];
const VALID_CRUSADE_STATUSES = [
  'convocada',
  'abierta',
  'en_curso',
  'victoriosa',
  'completada',
  'archivada',
  'cancelada',
] as const;

const CRUSADE_TRANSITIONS: Record<string, string[]> = {
  convocada: ['convocada', 'abierta', 'en_curso', 'victoriosa', 'completada', 'archivada', 'cancelada'],
  abierta: ['convocada', 'abierta', 'en_curso', 'victoriosa', 'completada', 'archivada', 'cancelada'],
  en_curso: ['en_curso', 'convocada', 'victoriosa', 'completada', 'archivada', 'cancelada'],
  victoriosa: ['victoriosa', 'completada', 'archivada'],
  completada: ['victoriosa', 'completada', 'archivada'],
  archivada: ['archivada', 'cancelada', 'convocada'],
  cancelada: ['archivada', 'cancelada', 'convocada'],
};

function parseShipsRequiredSafe(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map((s) => String(s));
  if (typeof raw !== 'string' || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((s) => String(s)) : [];
  } catch {
    return [];
  }
}

function parseMaxBrothersStrict(raw: unknown): { value?: number; error?: string } {
  if (raw === null || typeof raw === 'boolean' || typeof raw === 'object') {
    return {
      error: 'El cupo máximo de hermanos (max_brothers) debe ser un número entero mayor o igual a 1.',
    };
  }
  if (typeof raw === 'string' && raw.trim() === '') {
    return {
      error: 'El cupo máximo de hermanos (max_brothers) debe ser un número entero mayor o igual a 1.',
    };
  }
  if (typeof raw !== 'number' && typeof raw !== 'string') {
    return {
      error: 'El cupo máximo de hermanos (max_brothers) debe ser un número entero mayor o igual a 1.',
    };
  }
  const parsed = typeof raw === 'number' ? raw : Number(raw.trim());
  if (!Number.isInteger(parsed) || parsed < 1) {
    return {
      error: 'El cupo máximo de hermanos (max_brothers) debe ser un número entero mayor o igual a 1.',
    };
  }
  return { value: parsed };
}

function parseMaxBrothersCreate(raw: unknown, defaultValue = 16): { value?: number; error?: string } {
  if (raw === undefined || raw === null) {
    return { value: defaultValue };
  }
  return parseMaxBrothersStrict(raw);
}

// Listar todos los Edictos Sagrados / Cruzadas
crusadeRouter.get('/', requireApproved, (req: AuthenticatedRequest, res: Response) => {
  const currentUserId = req.user?.userId;
  const crusades = db
    .prepare(
      `SELECT c.*, u.display_name as creator_name, u.cargo as creator_cargo,
              (SELECT COUNT(*) FROM crusade_signups cs WHERE cs.crusade_id = c.id) as signups_count,
              (SELECT COUNT(*) FROM crusade_signups cs WHERE cs.crusade_id = c.id AND cs.user_id = ?) as user_is_signed
       FROM crusades c
       LEFT JOIN users u ON c.creator_id = u.id
       ORDER BY c.operation_date ASC`
    )
    .all(currentUserId) as any[];

  const enriched = crusades.map((c) => ({
    ...c,
    ships_required: parseShipsRequiredSafe(c.ships_required),
    user_is_signed: Boolean(c.user_is_signed),
  }));

  res.json(enriched);
});

// Endpoint directo en caliente para que el Oráculo / Agente IA proclame Edictos de Cruzada por orden del usuario
const handleAgentCreateCrusade = (req: AuthenticatedRequest, res: Response) => {
  if (!verifySyncToken(req)) {
    return res.status(401).json({
      error: 'Sello del Oráculo inválido. Proporciona el encabezado X-Agent-Token o X-Sync-Token.',
    });
  }

  const {
    title,
    description,
    briefing,
    operation_date,
    location = 'Pyro VI — Ruin Station',
    status = 'convocada',
    ships_required = ['Polaris', 'Redeemer', 'Eclipse'],
    max_brothers,
    creator_handle = 'Enanimus',
    initial_signups = [],
  } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'El título del Edicto de Cruzada (title) es obligatorio.' });
  }

  const maxCheck = parseMaxBrothersCreate(max_brothers, 16);
  if (maxCheck.error || maxCheck.value === undefined) {
    return res.status(400).json({ error: maxCheck.error });
  }
  const resolvedMaxBrothers = maxCheck.value;

  const creatorUser =
    (db
      .prepare('SELECT id, display_name, cargo FROM users WHERE LOWER(display_name) = LOWER(?) OR id = ?')
      .get(creator_handle, creator_handle) as any) ||
    (db.prepare("SELECT id, display_name, cargo FROM users WHERE id = 'usr-enanimus-profeta'").get() as any) ||
    (db.prepare('SELECT id, display_name, cargo FROM users ORDER BY rank_level DESC LIMIT 1').get() as any);

  const effectiveOpDate =
    operation_date || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

  const shipsArray = Array.isArray(ships_required)
    ? ships_required
    : String(ships_required)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

  const ritualBriefing =
    briefing ||
    `Por decreto de ${creatorUser.display_name} (${creatorUser.cargo}), se ordena desplegar "${title}" en ${location}. El incumplimiento es una ofensa contra el Abismo. La recompensa: la Marca del Abismo. El costo del fracaso: el silencio. IN NOMINI OBLIVIONIS.`;

  const id = crypto.randomUUID();

  db.prepare(
    `INSERT INTO crusades (
      id, title, description, briefing, operation_date, location,
      status, creator_id, ships_required, max_brothers
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    title,
    description || ritualBriefing,
    ritualBriefing,
    effectiveOpDate,
    location,
    status,
    creatorUser.id,
    JSON.stringify(shipsArray),
    resolvedMaxBrothers
  );

  // Inscribir automáticamente al emisor o a la lista initial_signups si se proporciona
  const insertSignup = db.prepare(
    `INSERT OR IGNORE INTO crusade_signups (id, crusade_id, user_id, ship_brought, role_assigned)
     VALUES (?, ?, ?, ?, ?)`
  );

  if (Array.isArray(initial_signups) && initial_signups.length > 0) {
    for (const sig of initial_signups) {
      const handle = typeof sig === 'string' ? sig : sig.handle;
      const member = db
        .prepare('SELECT id FROM users WHERE LOWER(display_name) = LOWER(?) OR id = ?')
        .get(handle, handle) as any;
      if (member) {
        insertSignup.run(
          crypto.randomUUID(),
          id,
          member.id,
          (typeof sig === 'object' && sig.ship_brought) || shipsArray[0] || 'Nave Consagrada',
          (typeof sig === 'object' && sig.role_assigned) || 'Vanguardia de Ceniza'
        );
      }
    }
  } else {
    insertSignup.run(
      crypto.randomUUID(),
      id,
      creatorUser.id,
      shipsArray[0] || 'RSI Polaris',
      'Mando del Concilio'
    );
  }

  const created = db.prepare('SELECT * FROM crusades WHERE id = ?').get(id) as any;

  res.status(201).json({
    success: true,
    message: `Edicto de Cruzada "${title}" proclamado e inscrito en caliente en Edictos y Calendario Abisal. IN NOMINI OBLIVIONIS.`,
    crusade: {
      ...created,
      ships_required: shipsArray,
    },
  });
};

crusadeRouter.post('/agent', handleAgentCreateCrusade);
crusadeRouter.post('/proclaim', handleAgentCreateCrusade);

// Detalle de Cruzada con contingente de hermanos consagrados
crusadeRouter.get('/:id', requireApproved, (req: AuthenticatedRequest, res: Response) => {
  const id = String(req.params.id || '');
  const crusade = db
    .prepare(
      `SELECT c.*, u.display_name as creator_name, u.cargo as creator_cargo
       FROM crusades c
       LEFT JOIN users u ON c.creator_id = u.id
       WHERE c.id = ?`
    )
    .get(id) as any;

  if (!crusade) return res.status(404).json({ error: 'Edicto de Cruzada no hallado en los archivos.' });

  const roster = db
    .prepare(
      `SELECT cs.*, u.display_name, u.rsi_handle, u.discord_avatar, u.cargo, u.rank_id, u.rank_level,
              ms.ship_id as catalog_ship_id, ms.ship_name, ms.manufacturer, ms.manufacturer as ship_manufacturer,
              ms.ship_class, ms.callsign, ms.callsign as ship_callsign, ms.status as ship_status
       FROM crusade_signups cs
       JOIN users u ON cs.user_id = u.id
       LEFT JOIN member_ships ms ON cs.member_ship_id = ms.id
       WHERE cs.crusade_id = ?
       ORDER BY u.rank_level DESC, cs.joined_at ASC`
    )
    .all(id);

  res.json({
    ...crusade,
    ships_required: parseShipsRequiredSafe(crusade.ships_required),
    roster,
  });
});

// Proclamar nuevo Edicto de Cruzada
crusadeRouter.post('/', requireApproved, (req: AuthenticatedRequest, res: Response) => {
  if (!['oficial', 'consejo', 'admin'].includes(req.user?.role || '')) {
    return res.status(403).json({
      error: 'Solo las Voces del Abismo, los Profetas de la Ruina y el Heraldo pueden proclamar un Edicto de Cruzada.',
    });
  }

  const { title, description, briefing, operation_date, location, ships_required = [], max_brothers } = req.body;
  if (!title || !operation_date || !location) {
    return res.status(400).json({ error: 'Título, fecha del ciclo y ubicación son obligatorios.' });
  }

  const maxCheck = parseMaxBrothersCreate(max_brothers, 16);
  if (maxCheck.error || maxCheck.value === undefined) {
    return res.status(400).json({ error: maxCheck.error });
  }

  const shipsArray = Array.isArray(ships_required)
    ? ships_required.map((s: unknown) => String(s))
    : typeof ships_required === 'string'
      ? ships_required
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

  const id = crypto.randomUUID();
  const creatorId = req.user?.userId;

  db.prepare(
    `INSERT INTO crusades (
      id, title, description, briefing, operation_date, location,
      creator_id, ships_required, max_brothers
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    title,
    description || '',
    briefing || '',
    operation_date,
    location,
    creatorId,
    JSON.stringify(shipsArray),
    maxCheck.value
  );

  res.status(201).json({ id, title, success: true });
});

// Responder al Llamado (Alistarse en el contingente con nave operativa del Hangar o como tripulación/infantería)
crusadeRouter.post('/:id/signup', requireApproved, (req: AuthenticatedRequest, res: Response) => {
  const crusadeId = String(req.params.id || '');
  const userId = req.user!.userId;
  const { member_ship_id, ship_brought, role_assigned } = req.body as {
    member_ship_id?: string | null;
    ship_brought?: string | null;
    role_assigned?: string;
  };

  const crusade = db.prepare('SELECT * FROM crusades WHERE id = ?').get(crusadeId) as any;
  if (!crusade) return res.status(404).json({ error: 'Cruzada no hallada' });

  if (CLOSED_CRUSADE_STATUSES.includes(String(crusade.status))) {
    return res.status(400).json({ error: 'Este Edicto de Cruzada ya no acepta nuevas inscripciones.' });
  }

  const existingSignup = db
    .prepare('SELECT id FROM crusade_signups WHERE crusade_id = ? AND user_id = ?')
    .get(crusadeId, userId);
  if (existingSignup) {
    return res.status(400).json({ error: 'Tu nombre ya figura en el contingente de este Edicto.' });
  }

  const countRow = db
    .prepare('SELECT COUNT(*) as count FROM crusade_signups WHERE crusade_id = ?')
    .get(crusadeId) as { count: number };
  const parsedMax = Number(crusade.max_brothers);
  const maxCap =
    crusade.max_brothers !== null &&
    crusade.max_brothers !== undefined &&
    Number.isFinite(parsedMax) &&
    parsedMax > 0
      ? parsedMax
      : 16;
  if (countRow.count >= maxCap) {
    return res.status(400).json({ error: 'El contingente para este Edicto está completo.' });
  }

  const resolvedRole =
    typeof role_assigned === 'string' && role_assigned.trim()
      ? role_assigned.trim()
      : 'Vanguardia de Ceniza';

  let resolvedMemberShipId: string | null = null;
  let resolvedShipBrought: string | null = null;

  const cleanShipId = typeof member_ship_id === 'string' ? member_ship_id.trim() : '';
  if (cleanShipId) {
    const ship = db.prepare('SELECT * FROM member_ships WHERE id = ?').get(cleanShipId) as any;
    if (!ship) {
      return res.status(404).json({ error: 'Nave no encontrada en los registros del Hangar.' });
    }
    if (ship.user_id !== userId) {
      return res.status(403).json({ error: 'No puedes desplegar una nave que pertenece a otro hermano.' });
    }
    if (ship.status !== 'operativa') {
      return res.status(400).json({
        error: "Solo puedes desplegar naves en estado 'operativa' de tu Hangar Personal.",
      });
    }
    resolvedMemberShipId = ship.id;
    resolvedShipBrought = ship.callsign ? `${ship.ship_name} — "${ship.callsign}"` : ship.ship_name;
  } else {
    resolvedMemberShipId = null;
    resolvedShipBrought =
      typeof ship_brought === 'string' && ship_brought.trim() ? ship_brought.trim() : null;
  }

  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO crusade_signups (id, crusade_id, user_id, member_ship_id, ship_brought, role_assigned)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, crusadeId, userId, resolvedMemberShipId, resolvedShipBrought, resolvedRole);

  res.json({
    success: true,
    message: 'Has jurado tu sangre y tu acero para este Edicto. IN NOMINI OBLIVIONIS.',
  });
});

// Moderar / actualizar Edicto de Cruzada (Oficiales creadores, Consejo o Heraldo)
crusadeRouter.patch('/:id', requireOfficerOrAbove, (req: AuthenticatedRequest, res: Response) => {
  const id = String(req.params.id || '');
  const existing = db.prepare('SELECT * FROM crusades WHERE id = ?').get(id) as any;
  if (!existing) {
    return res.status(404).json({ error: 'Edicto de Cruzada no hallado en los archivos.' });
  }

  if (req.user!.role === 'oficial' && existing.creator_id !== req.user!.userId) {
    return res.status(403).json({
      error: 'Solo el oficial creador de esta Cruzada o el Concilio del Vacío pueden modificarla.',
    });
  }

  const { title, description, briefing, operation_date, location, ships_required, max_brothers, status } =
    req.body;

  const updates: string[] = [];
  const params: any[] = [];

  if (status !== undefined) {
    if (!VALID_CRUSADE_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Estado de Cruzada inválido: '${status}'.` });
    }
    const allowedNext = CRUSADE_TRANSITIONS[existing.status] || VALID_CRUSADE_STATUSES;
    if (!allowedNext.includes(status)) {
      return res.status(400).json({
        error: `Transición de estado no permitida: '${existing.status}' -> '${status}'.`,
      });
    }
    if (
      ['archivada', 'cancelada'].includes(existing.status) &&
      status === 'convocada' &&
      !['consejo', 'admin'].includes(req.user!.role)
    ) {
      return res.status(403).json({
        error: 'Solo el Concilio del Vacío o el Heraldo pueden reabrir una Cruzada archivada o cancelada.',
      });
    }
    updates.push('status = ?');
    params.push(status);
  }

  if (title !== undefined) {
    const cleanTitle = String(title).trim();
    if (!cleanTitle) return res.status(400).json({ error: 'El título no puede estar vacío.' });
    updates.push('title = ?');
    params.push(cleanTitle);
  }
  if (description !== undefined) {
    updates.push('description = ?');
    params.push(String(description));
  }
  if (briefing !== undefined) {
    updates.push('briefing = ?');
    params.push(String(briefing));
  }
  if (operation_date !== undefined) {
    updates.push('operation_date = ?');
    params.push(String(operation_date));
  }
  if (location !== undefined) {
    updates.push('location = ?');
    params.push(String(location));
  }
  if (ships_required !== undefined) {
    const shipsArr = Array.isArray(ships_required)
      ? ships_required
      : String(ships_required)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
    updates.push('ships_required = ?');
    params.push(JSON.stringify(shipsArr));
  }
  if (max_brothers !== undefined) {
    const maxCheck = parseMaxBrothersStrict(max_brothers);
    if (maxCheck.error) {
      return res.status(400).json({ error: maxCheck.error });
    }
    updates.push('max_brothers = ?');
    params.push(maxCheck.value!);
  }

  if (updates.length > 0) {
    params.push(id);
    db.prepare(`UPDATE crusades SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  if (['consejo', 'admin'].includes(req.user!.role)) {
    logCouncilAction(req.user!.userId, 'CRUSADE_UPDATED', null, {
      crusade_id: id,
      title: title || existing.title,
      previous_status: existing.status,
      new_status: status || existing.status,
    });
  }

  const updated = db.prepare('SELECT * FROM crusades WHERE id = ?').get(id) as any;
  res.json({
    success: true,
    crusade: {
      ...updated,
      ships_required: parseShipsRequiredSafe(updated.ships_required),
    },
  });
});

// Disolver / eliminar Edicto de Cruzada (Solo Consejo o Heraldo)
crusadeRouter.delete('/:id', requireCouncil, (req: AuthenticatedRequest, res: Response) => {
  const id = String(req.params.id || '');
  const existing = db.prepare('SELECT * FROM crusades WHERE id = ?').get(id) as any;
  if (!existing) {
    return res.status(404).json({ error: 'Edicto de Cruzada no hallado en los archivos.' });
  }

  db.prepare('DELETE FROM crusades WHERE id = ?').run(id);
  logCouncilAction(req.user!.userId, 'CRUSADE_DELETED', null, {
    crusade_id: id,
    title: existing.title,
  });

  res.json({ success: true, message: 'Edicto de Cruzada disuelto y arrojado a La Ceniza Fría.' });
});

// Abandonar contingente (Advertencia de La Ceniza Fría)
crusadeRouter.delete('/:id/signup', requireApproved, (req: AuthenticatedRequest, res: Response) => {
  const crusadeId = String(req.params.id || '');
  const userId = req.user?.userId;

  db.prepare('DELETE FROM crusade_signups WHERE crusade_id = ? AND user_id = ?').run(crusadeId, userId);
  res.json({
    success: true,
    message: 'Tu nombre ha sido retirado del contingente. Recuerda que la deserción injustificada conduce a La Ceniza Fría.',
  });
});

// Calendario Abisal unificado
crusadeRouter.get('/calendar/all', requireApproved, (_req: AuthenticatedRequest, res: Response) => {
  const crusades = db
    .prepare(
      `SELECT id, title, operation_date as start_date, location, 'cruzada' as type, status
       FROM crusades
       ORDER BY operation_date ASC`
    )
    .all();

  const objectives = db
    .prepare(
      `SELECT id, title, due_date as start_date, category as location, 'designio' as type, status
       FROM objectives
       WHERE due_date IS NOT NULL
       ORDER BY due_date ASC`
    )
    .all();

  const polls = db
    .prepare(
      `SELECT id, title, closes_at as start_date, 'Concilio del Vacío' as location, 'conclave' as type, status
       FROM polls
       WHERE status = 'open'
       ORDER BY closes_at ASC`
    )
    .all();

  res.json({
    events: [...crusades, ...objectives, ...polls],
  });
});
