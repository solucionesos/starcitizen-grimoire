import { Router, Response } from 'express';
import { requireApproved, AuthenticatedRequest } from '../auth/authMiddleware.js';
import { db } from '../database/sqlite.js';
import crypto from 'node:crypto';

export const crusadeRouter = Router();

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
    ships_required: c.ships_required ? JSON.parse(c.ships_required) : [],
    user_is_signed: Boolean(c.user_is_signed),
  }));

  res.json(enriched);
});

// Endpoint directo en caliente para que el Oráculo / Agente IA proclame Edictos de Cruzada por orden del usuario
const handleAgentCreateCrusade = (req: AuthenticatedRequest, res: Response) => {
  const expectedToken = process.env.SYNC_SECRET_TOKEN || 'ancalagon-sync-secret';
  const providedToken = req.headers['x-sync-token'] || req.headers['x-agent-token'] || req.body?.agent_token;

  if (providedToken !== expectedToken) {
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
    max_brothers = 24,
    creator_handle = 'Enanimus',
    initial_signups = [],
  } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'El título del Edicto de Cruzada (title) es obligatorio.' });
  }

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
    Number(max_brothers) || 24
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
  const id = req.params.id;
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
      `SELECT cs.*, u.display_name, u.discord_avatar, u.cargo, u.rank_id, u.rank_level
       FROM crusade_signups cs
       JOIN users u ON cs.user_id = u.id
       WHERE cs.crusade_id = ?
       ORDER BY u.rank_level DESC, cs.joined_at ASC`
    )
    .all(id);

  res.json({
    ...crusade,
    ships_required: crusade.ships_required ? JSON.parse(crusade.ships_required) : [],
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

  const { title, description, briefing, operation_date, location, ships_required = [], max_brothers = 16 } = req.body;
  if (!title || !operation_date || !location) {
    return res.status(400).json({ error: 'Título, fecha del ciclo y ubicación son obligatorios.' });
  }

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
    JSON.stringify(ships_required),
    max_brothers
  );

  res.status(201).json({ id, title, success: true });
});

// Responder al Llamado (Alistarse en el contingente)
crusadeRouter.post('/:id/signup', requireApproved, (req: AuthenticatedRequest, res: Response) => {
  const crusadeId = req.params.id;
  const userId = req.user?.userId;
  const { ship_brought, role_assigned = 'Vanguardia de Ceniza' } = req.body;

  const crusade = db.prepare('SELECT * FROM crusades WHERE id = ?').get(crusadeId) as any;
  if (!crusade) return res.status(404).json({ error: 'Cruzada no hallada' });

  const count = (db.prepare('SELECT COUNT(*) as c FROM crusade_signups WHERE crusade_id = ?').get(crusadeId) as any).c;
  if (count >= crusade.max_brothers) {
    return res.status(400).json({ error: 'El contingente para este Edicto está completo.' });
  }

  const id = crypto.randomUUID();
  try {
    db.prepare(
      `INSERT INTO crusade_signups (id, crusade_id, user_id, ship_brought, role_assigned)
       VALUES (?, ?, ?, ?, ?)`
    ).run(id, crusadeId, userId, ship_brought || null, role_assigned);

    res.json({ success: true, message: 'Has jurado tu sangre y tu nave para este Edicto. IN NOMINI OBLIVIONIS.' });
  } catch {
    res.status(400).json({ error: 'Tu nombre ya figura en el contingente de este Edicto.' });
  }
});

// Abandonar contingente (Advertencia de La Ceniza Fría)
crusadeRouter.delete('/:id/signup', requireApproved, (req: AuthenticatedRequest, res: Response) => {
  const crusadeId = req.params.id;
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
