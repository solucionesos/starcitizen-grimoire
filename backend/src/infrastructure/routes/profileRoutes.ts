import { Router, Response } from 'express';
import crypto from 'node:crypto';
import { optionalAuth, requireApproved, AuthenticatedRequest } from '../auth/authMiddleware.js';
import { resolveUserRank } from '../auth/authService.js';
import { db } from '../database/sqlite.js';
import { IGameDataRepository } from '../../domain/ports/IGameDataRepository.js';

const VALID_SHIP_STATUSES = ['operativa', 'en_forja', 'reserva'] as const;

function parseSpecialtiesSafe(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function buildPublicMember(
  u: any,
  marks: any[],
  ships: any[],
  includeSensitiveOpsec: boolean
) {
  const base: Record<string, any> = {
    id: u.id,
    display_name: u.display_name,
    rsi_handle: u.rsi_handle || null,
    discord_avatar: u.discord_avatar || null,
    status: u.status,
    role: u.role,
    rank: resolveUserRank(u.rank_id, u.status),
    rank_id: u.rank_id,
    rank_level: u.rank_level,
    cargo: u.cargo,
    specialties: parseSpecialtiesSafe(u.specialties),
    bio: u.bio || null,
    home_system: u.home_system || 'Pyro',
    combat_role: u.combat_role || 'Vanguardia',
    is_discord_linked: Boolean(u.is_discord_linked),
    abyssal_marks: marks,
    created_at: u.created_at,
  };

  // OPSEC strict gate: NEVER expose expected_discord_username; only expose discord_username & ships to approved brothers
  if (includeSensitiveOpsec) {
    base.discord_username = u.is_discord_linked ? u.discord_username : null;
    base.ships = ships;
  }

  return base;
}

export function createHermandadRouter(): Router {
  const router = Router();

  // Directorio público de La Hermandad con regla OPSEC estricta
  router.get('/', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
    const isApproved = Boolean(req.user && req.user.status === 'approved');

    const users = db
      .prepare(
        `SELECT * FROM users
         WHERE status = 'approved'
         ORDER BY rank_level DESC, display_name ASC`
      )
      .all() as any[];

    const marksRows = db
      .prepare(
        `SELECT m.*, a.display_name as awarded_by_name
         FROM abyssal_marks m
         JOIN users u ON m.user_id = u.id
         LEFT JOIN users a ON m.awarded_by = a.id
         WHERE u.status = 'approved'
         ORDER BY m.created_at DESC`
      )
      .all() as any[];

    const marksByUser = new Map<string, any[]>();
    for (const m of marksRows) {
      const list = marksByUser.get(m.user_id) || [];
      list.push(m);
      marksByUser.set(m.user_id, list);
    }

    const shipRows = db
      .prepare(
        `SELECT ms.*
         FROM member_ships ms
         JOIN users u ON ms.user_id = u.id
         WHERE u.status = 'approved'
         ORDER BY ms.created_at DESC`
      )
      .all() as any[];

    const shipsByUser = new Map<string, any[]>();
    const modelCounter = new Map<
      string,
      { ship_name: string; manufacturer: string; ship_class: string; count: number }
    >();
    const classCounter = new Map<string, number>();
    let totalOperational = 0;

    for (const s of shipRows) {
      const userList = shipsByUser.get(s.user_id) || [];
      userList.push(s);
      shipsByUser.set(s.user_id, userList);

      if (s.status === 'operativa') {
        totalOperational += 1;
        const mfr = s.manufacturer || 'Desconocido';
        const cls = s.ship_class || 'Nave';
        const modelKey = `${s.ship_name}||${mfr}||${cls}`;
        const existingModel = modelCounter.get(modelKey);
        if (existingModel) {
          existingModel.count += 1;
        } else {
          modelCounter.set(modelKey, {
            ship_name: s.ship_name,
            manufacturer: mfr,
            ship_class: cls,
            count: 1,
          });
        }
        classCounter.set(cls, (classCounter.get(cls) || 0) + 1);
      }
    }

    const by_model = Array.from(modelCounter.values()).sort(
      (a, b) => b.count - a.count || a.ship_name.localeCompare(b.ship_name)
    );
    const by_class = Array.from(classCounter.entries())
      .map(([ship_class, count]) => ({ ship_class, count }))
      .sort((a, b) => b.count - a.count || a.ship_class.localeCompare(b.ship_class));

    const members = users.map((u) =>
      buildPublicMember(
        u,
        marksByUser.get(u.id) || [],
        shipsByUser.get(u.id) || [],
        isApproved
      )
    );

    res.json({
      members,
      fleet_summary: {
        total_operational: totalOperational,
        by_model,
        by_class,
      },
      is_authenticated_brother: isApproved,
    });
  });

  // Ficha pública individual de un hermano por rsi_handle, display_name o id
  router.get('/:handle', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
    const isApproved = Boolean(req.user && req.user.status === 'approved');
    let rawHandle = String(req.params.handle || '').trim();
    try {
      rawHandle = decodeURIComponent(rawHandle).trim();
    } catch {
      // Keep rawHandle if malformed encoding
    }

    if (!rawHandle) {
      return res.status(400).json({ error: 'Identificador de hermano requerido.' });
    }

    const user = db
      .prepare(
        `SELECT * FROM users
         WHERE status = 'approved'
           AND (id = ? OR LOWER(TRIM(COALESCE(rsi_handle, ''))) = LOWER(?) OR LOWER(TRIM(display_name)) = LOWER(?))
         ORDER BY CASE
           WHEN id = ? THEN 0
           WHEN LOWER(TRIM(COALESCE(rsi_handle, ''))) = LOWER(?) THEN 1
           WHEN LOWER(TRIM(display_name)) = LOWER(?) THEN 2
           ELSE 3
         END, created_at ASC, is_discord_linked ASC, rowid ASC, id ASC
         LIMIT 1`
      )
      .get(rawHandle, rawHandle, rawHandle, rawHandle, rawHandle, rawHandle) as any;

    if (!user) {
      return res.status(404).json({ error: 'Hermano no hallado en el registro consagrado.' });
    }

    const marks = db
      .prepare(
        `SELECT m.*, a.display_name as awarded_by_name
         FROM abyssal_marks m
         LEFT JOIN users a ON m.awarded_by = a.id
         WHERE m.user_id = ?
         ORDER BY m.created_at DESC`
      )
      .all(user.id) as any[];

    const ships = isApproved
      ? (db
          .prepare('SELECT * FROM member_ships WHERE user_id = ? ORDER BY created_at DESC')
          .all(user.id) as any[])
      : [];

    res.json({
      member: buildPublicMember(user, marks, ships, isApproved),
      is_authenticated_brother: isApproved,
    });
  });

  return router;
}

export function createProfileRouter(repository: IGameDataRepository): Router {
  const router = Router();

  // Listar naves del Hangar Personal ("Mis Arcas Estelares")
  router.get('/ships', requireApproved, (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const ships = db
      .prepare(
        `SELECT * FROM member_ships
         WHERE user_id = ?
         ORDER BY CASE status WHEN 'operativa' THEN 0 WHEN 'en_forja' THEN 1 ELSE 2 END, created_at DESC`
      )
      .all(userId);
    res.json({ ships });
  });

  // Registrar una nave en el Hangar Personal
  router.post('/ships', requireApproved, async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId;
    const {
      ship_id,
      ship_name,
      manufacturer,
      ship_class,
      callsign,
      status = 'operativa',
    } = req.body as {
      ship_id?: string;
      ship_name?: string;
      manufacturer?: string;
      ship_class?: string;
      callsign?: string | null;
      status?: string;
    };

    if (!VALID_SHIP_STATUSES.includes(status as any)) {
      return res.status(400).json({
        error: "Estado de nave inválido. Debe ser 'operativa', 'en_forja' o 'reserva'.",
      });
    }

    const rawId = typeof ship_id === 'string' ? ship_id.trim() : '';
    const rawName = typeof ship_name === 'string' ? ship_name.trim() : '';
    if (!rawId && !rawName) {
      return res.status(400).json({ error: 'Debes especificar el modelo de Arca Estelar (ship_id o ship_name).' });
    }

    let resolvedShipId = rawId || rawName;
    let resolvedShipName = rawName || rawId;
    let resolvedManufacturer =
      typeof manufacturer === 'string' && manufacturer.trim() ? manufacturer.trim() : 'Desconocido';
    let resolvedClass =
      typeof ship_class === 'string' && ship_class.trim() ? ship_class.trim() : 'Nave';

    try {
      const catalog = await repository.getAllShips();
      const matched = catalog.find(
        (s: any) =>
          (rawId && String(s.id) === rawId) ||
          (rawName && String(s.name || '').trim().toLowerCase() === rawName.toLowerCase())
      );

      if (matched) {
        resolvedShipId = String(matched.id || resolvedShipId);
        resolvedShipName = String(matched.name || resolvedShipName).trim();
        const catMfr =
          typeof matched.manufacturer === 'object' && matched.manufacturer !== null
            ? matched.manufacturer.name
            : matched.manufacturer;
        if (typeof catMfr === 'string' && catMfr.trim()) {
          resolvedManufacturer = catMfr.trim();
        }
        const catClass = matched.className || matched.focus;
        if (typeof catClass === 'string' && catClass.trim()) {
          resolvedClass = catClass.trim();
        }
      }
    } catch {
      // Fallback to client-provided metadata if catalog read fails
    }

    const cleanCallsign =
      typeof callsign === 'string' && callsign.trim() ? callsign.trim().slice(0, 64) : null;
    const id = crypto.randomUUID();

    db.prepare(
      `INSERT INTO member_ships (id, user_id, ship_id, ship_name, manufacturer, ship_class, callsign, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      userId,
      resolvedShipId,
      resolvedShipName,
      resolvedManufacturer,
      resolvedClass,
      cleanCallsign,
      status
    );

    const created = db.prepare('SELECT * FROM member_ships WHERE id = ?').get(id);
    res.status(201).json({ success: true, ship: created });
  });

  // Actualizar callsign, estado o metadatos de una nave propia
  router.patch('/ships/:id', requireApproved, (req: AuthenticatedRequest, res: Response) => {
    const id = String(req.params.id || '');
    const userId = req.user!.userId;
    const { callsign, status, ship_name, manufacturer, ship_class } = req.body as {
      callsign?: string | null;
      status?: string;
      ship_name?: string;
      manufacturer?: string;
      ship_class?: string;
    };

    const existing = db.prepare('SELECT * FROM member_ships WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Arca Estelar no hallada en tu Hangar.' });
    }
    if (existing.user_id !== userId) {
      return res.status(403).json({ error: 'No puedes alterar un Arca Estelar que pertenece a otro hermano.' });
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (status !== undefined) {
      if (!VALID_SHIP_STATUSES.includes(status as any)) {
        return res.status(400).json({
          error: "Estado de nave inválido. Debe ser 'operativa', 'en_forja' o 'reserva'.",
        });
      }
      updates.push('status = ?');
      params.push(status);
    }

    if (callsign !== undefined) {
      const cleanCallsign =
        typeof callsign === 'string' && callsign.trim() ? callsign.trim().slice(0, 64) : null;
      updates.push('callsign = ?');
      params.push(cleanCallsign);
    }

    if (ship_name !== undefined) {
      const cleanName = typeof ship_name === 'string' ? ship_name.trim() : '';
      if (!cleanName) {
        return res.status(400).json({ error: 'El nombre de la nave no puede estar vacío.' });
      }
      updates.push('ship_name = ?');
      params.push(cleanName);
    }

    if (manufacturer !== undefined) {
      const cleanMfr = typeof manufacturer === 'string' && manufacturer.trim() ? manufacturer.trim() : 'Desconocido';
      updates.push('manufacturer = ?');
      params.push(cleanMfr);
    }

    if (ship_class !== undefined) {
      const cleanClass = typeof ship_class === 'string' && ship_class.trim() ? ship_class.trim() : 'Nave';
      updates.push('ship_class = ?');
      params.push(cleanClass);
    }

    if (updates.length > 0) {
      params.push(id);
      db.prepare(`UPDATE member_ships SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    }

    const updated = db.prepare('SELECT * FROM member_ships WHERE id = ?').get(id);
    res.json({ success: true, ship: updated });
  });

  // Retirar una nave del Hangar Personal (desvinculando referencias en crusade_signups dentro de transacción)
  router.delete('/ships/:id', requireApproved, (req: AuthenticatedRequest, res: Response) => {
    const id = String(req.params.id || '');
    const userId = req.user!.userId;

    const existing = db.prepare('SELECT * FROM member_ships WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Arca Estelar no hallada en tu Hangar.' });
    }
    if (existing.user_id !== userId) {
      return res.status(403).json({ error: 'No puedes retirar un Arca Estelar que pertenece a otro hermano.' });
    }

    const deleteShipTx = db.transaction(() => {
      db.prepare('UPDATE crusade_signups SET member_ship_id = NULL WHERE member_ship_id = ?').run(id);
      db.prepare('DELETE FROM member_ships WHERE id = ?').run(id);
    });
    deleteShipTx();

    res.json({ success: true, message: 'Arca Estelar retirada de tu Hangar Personal.' });
  });

  return router;
}

export function createProfileRouters(repository: IGameDataRepository) {
  return {
    hermandadRouter: createHermandadRouter(),
    profileRouter: createProfileRouter(repository),
  };
}
