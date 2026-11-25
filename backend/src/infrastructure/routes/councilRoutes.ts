import { Router, Response } from 'express';
import crypto from 'node:crypto';
import {
  requireCouncil,
  assertCanManageTarget,
  HttpError,
  AuthenticatedRequest,
} from '../auth/authMiddleware.js';
import {
  ESCALA_DEL_ABISMO,
  CANDIDATO_UMBRAL,
  resolveUserRank,
  normalizeDiscordUsername,
  suggestRoleForRankLevel,
  mergeUserIntoRoster,
  unlinkDiscordFromUser,
  logCouncilAction,
} from '../auth/authService.js';
import { db } from '../database/sqlite.js';
import { IGameDataRepository } from '../../domain/ports/IGameDataRepository.js';

const VALID_ROLES = ['neofito', 'hermano', 'oficial', 'consejo', 'admin'] as const;
const VALID_STATUSES = ['pending', 'approved', 'rejected', 'suspended'] as const;
const VALID_BLOCK_TYPES = ['p', 'quote', 'header', 'grid'] as const;
const FORBIDDEN_YEAR_RE = /\b202\d\b/;

function parseSpecialtiesSafe(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function enrichCouncilUser(u: any) {
  const ships = db
    .prepare('SELECT * FROM member_ships WHERE user_id = ? ORDER BY created_at DESC')
    .all(u.id);
  const marks = db
    .prepare(
      `SELECT m.*, a.display_name as awarded_by_name
       FROM abyssal_marks m
       LEFT JOIN users a ON m.awarded_by = a.id
       WHERE m.user_id = ?
       ORDER BY m.created_at DESC`
    )
    .all(u.id);

  return {
    ...u,
    is_discord_linked: Boolean(u.is_discord_linked),
    rank: resolveUserRank(u.rank_id, u.status),
    specialties: parseSpecialtiesSafe(u.specialties),
    ships,
    abyssal_marks: marks,
  };
}

function collectAllStrings(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value];
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return [String(value)];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectAllStrings(item));
  }
  if (value && typeof value === 'object') {
    return Object.values(value).flatMap((v) => collectAllStrings(v));
  }
  return [];
}

function collectVisibleBlockStrings(blocks: any[]): string[] {
  const parts: string[] = [];
  if (!Array.isArray(blocks)) return parts;

  for (const b of blocks) {
    if (!b || typeof b !== 'object') continue;

    if (b.type === 'p' || b.type === 'quote') {
      if (typeof b.text === 'string' && b.text.trim()) parts.push(b.text);
      continue;
    }

    if (b.type === 'header') {
      if (typeof b.title === 'string' && b.title.trim()) parts.push(b.title);
      continue;
    }

    if (b.type === 'grid' && Array.isArray(b.items)) {
      for (const item of b.items) {
        if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
        if (typeof item.title === 'string' && item.title.trim()) parts.push(item.title);
        if (typeof item.text === 'string' && item.text.trim()) parts.push(item.text);
      }
    }
  }

  return parts;
}

function findApprovedIdentityConflict(
  excludeUserId: string,
  candidateValue: string
): { id: string; display_name: string } | undefined {
  return db
    .prepare(
      `SELECT id, display_name FROM users
       WHERE id != ?
         AND status = 'approved'
         AND (
           LOWER(TRIM(display_name)) = LOWER(?)
           OR LOWER(TRIM(COALESCE(rsi_handle, ''))) = LOWER(?)
           OR LOWER(id) = LOWER(?)
         )
       ORDER BY created_at ASC, rowid ASC
       LIMIT 1`
    )
    .get(excludeUserId, candidateValue, candidateValue, candidateValue) as
    | { id: string; display_name: string }
    | undefined;
}

function validateChronicleInput(body: any): { error?: string; blocks?: any[] } {
  const { title, subtitle, date, classification, icon, color, blocks, paragraphs } = body || {};
  if (!title || typeof title !== 'string' || !title.trim()) {
    return { error: 'El título de la Crónica (title) es obligatorio.' };
  }
  if (subtitle !== undefined && typeof subtitle !== 'string') {
    return { error: 'El campo subtitle debe ser una cadena de texto cuando se especifica.' };
  }
  if (date !== undefined && typeof date !== 'string') {
    return { error: 'El campo date debe ser una cadena de texto cuando se especifica.' };
  }
  if (classification !== undefined && typeof classification !== 'string') {
    return { error: 'El campo classification debe ser una cadena de texto cuando se especifica.' };
  }
  if (icon !== undefined && typeof icon !== 'string') {
    return { error: 'El campo icon debe ser una cadena de texto cuando se especifica.' };
  }
  if (color !== undefined && typeof color !== 'string') {
    return { error: 'El campo color debe ser una cadena de texto cuando se especifica.' };
  }

  let resolvedBlocks: any[] = [];
  if (Array.isArray(blocks) && blocks.length > 0) {
    resolvedBlocks = blocks;
  } else if (Array.isArray(paragraphs) && paragraphs.length > 0) {
    resolvedBlocks = paragraphs
      .filter((p: unknown) => typeof p === 'string' && p.trim().length > 0)
      .map((p: string, idx: number) => ({
        type: 'p',
        text: p,
        muted: idx > 0 && idx % 2 === 1,
      }));
  }

  if (resolvedBlocks.length === 0) {
    return { error: 'La Crónica debe contener al menos un bloque litúrgico en blocks.' };
  }

  for (const b of resolvedBlocks) {
    if (!b || typeof b !== 'object' || !VALID_BLOCK_TYPES.includes(b.type)) {
      return {
        error: "Cada bloque de la Crónica debe tener type válido ('p', 'quote', 'header' o 'grid').",
      };
    }
    if (b.icon !== undefined && typeof b.icon !== 'string') {
      return {
        error: 'El campo icon de cada bloque debe ser una cadena de texto cuando se especifica.',
      };
    }
    if (b.type === 'grid') {
      if (!Array.isArray(b.items) || b.items.length === 0) {
        return { error: "Un bloque de tipo 'grid' requiere un arreglo items no vacío." };
      }
      const hasInvalidGridItem = b.items.some(
        (item: unknown) =>
          !item ||
          typeof item !== 'object' ||
          Array.isArray(item) ||
          ((item as any).icon !== undefined && typeof (item as any).icon !== 'string') ||
          ((item as any).title !== undefined && typeof (item as any).title !== 'string') ||
          ((item as any).text !== undefined && typeof (item as any).text !== 'string') ||
          ((typeof (item as any).title !== 'string' || !(item as any).title.trim()) &&
            (typeof (item as any).text !== 'string' || !(item as any).text.trim()))
      );
      if (hasInvalidGridItem) {
        return {
          error:
            "Cada elemento de un bloque 'grid' debe ser un objeto con icon, title y text de tipo texto (si se especifican) y title o text no vacío.",
        };
      }
    } else if (b.type === 'header') {
      if (typeof b.title !== 'string' || !b.title.trim()) {
        return { error: "Un bloque de tipo 'header' requiere un título (title) no vacío." };
      }
    } else if (typeof b.text !== 'string' || !b.text.trim()) {
      return { error: `Un bloque de tipo '${b.type}' requiere un texto no vacío.` };
    }

    if (collectVisibleBlockStrings([b]).length === 0) {
      return {
        error: `El bloque de tipo '${b.type}' debe contener texto visible no vacío.`,
      };
    }
  }

  const allStrings = collectAllStrings([title, subtitle, date, classification, icon, color, resolvedBlocks, paragraphs]);
  if (allStrings.some((str) => FORBIDDEN_YEAR_RE.test(str))) {
    return {
      error:
        'Violación del Codex Oblivionis: prohibido mostrar años del siglo XXI (202x). Usa siempre el desplazamiento +930 (Ciclo 2956).',
    };
  }

  const visibleText = collectVisibleBlockStrings(resolvedBlocks).join('\n');
  if (!visibleText.toUpperCase().includes('IN NOMINI OBLIVIONIS')) {
    return {
      error:
        "Violación del Codex Oblivionis: la Crónica debe incluir el cierre sagrado 'IN NOMINI OBLIVIONIS' en su contenido visible.",
    };
  }

  return { blocks: resolvedBlocks };
}

export function createCouncilRouter(repository: IGameDataRepository): Router {
  const councilRouter = Router();

  // 1. Listar miembros de la flota con naves, marcas y pending_count
  councilRouter.get('/users', requireCouncil, (req: AuthenticatedRequest, res: Response) => {
    const status = req.query.status as string | undefined;
    let query = 'SELECT * FROM users ORDER BY rank_level DESC, created_at DESC';
    let params: any[] = [];

    if (status) {
      query = 'SELECT * FROM users WHERE status = ? ORDER BY rank_level DESC, created_at DESC';
      params = [status];
    }

    const users = db.prepare(query).all(...params) as any[];
    const pendingRow = db
      .prepare("SELECT COUNT(*) as c FROM users WHERE status = 'pending'")
      .get() as { c: number };

    res.json({
      users: users.map(enrichCouncilUser),
      pending_count: pendingRow?.c || 0,
    });
  });

  // 2. Pre-registrar miembro del Roster sin exigir login previo en Discord
  councilRouter.post('/users/preregister', requireCouncil, (req: AuthenticatedRequest, res: Response) => {
    const actorId = req.user!.userId;
    const actorRole = req.user!.role;
    const {
      display_name,
      rsi_handle,
      expected_discord_username,
      rank_id = 'sombras',
      role,
      cargo,
      home_system = 'Pyro',
      combat_role = 'Vanguardia',
      bio,
      specialties = [],
    } = req.body;

    if (!display_name || typeof display_name !== 'string' || !display_name.trim()) {
      return res.status(400).json({ error: 'El nombre de combate (display_name) es obligatorio.' });
    }

    const targetRank = ESCALA_DEL_ABISMO.find((r) => r.id === rank_id);
    if (!targetRank) {
      return res.status(400).json({ error: `Rango '${rank_id}' no pertenece a La Escala del Abismo.` });
    }

    const resolvedRole = role !== undefined ? role : suggestRoleForRankLevel(targetRank.level);
    if (!VALID_ROLES.includes(resolvedRole)) {
      return res.status(400).json({ error: `Rol '${resolvedRole}' inválido.` });
    }

    const rbacError = assertCanManageTarget(
      actorRole,
      { role: 'hermano', rank_level: 1 },
      resolvedRole,
      targetRank.level
    );
    if (rbacError) {
      return res.status(403).json({ error: rbacError });
    }

    const cleanDisplay = display_name.trim();
    const displayConflict = db
      .prepare(
        `SELECT id FROM users
         WHERE LOWER(TRIM(display_name)) = LOWER(?)
            OR LOWER(TRIM(COALESCE(rsi_handle, ''))) = LOWER(?)
            OR LOWER(id) = LOWER(?)
         LIMIT 1`
      )
      .get(cleanDisplay, cleanDisplay, cleanDisplay);
    if (displayConflict) {
      return res.status(409).json({
        error: 'Ese nombre de Hermano ya está en uso en los registros.',
      });
    }

    const cleanRsi =
      typeof rsi_handle === 'string' && rsi_handle.trim() ? rsi_handle.trim() : null;
    if (cleanRsi) {
      const rsiConflict = db
        .prepare(
          `SELECT id FROM users
           WHERE LOWER(TRIM(COALESCE(rsi_handle, ''))) = LOWER(?)
              OR LOWER(TRIM(display_name)) = LOWER(?)
              OR LOWER(id) = LOWER(?)
           LIMIT 1`
        )
        .get(cleanRsi, cleanRsi, cleanRsi);
      if (rsiConflict) {
        return res.status(409).json({
          error: 'Ese Handle RSI ya pertenece a otro Hermano de la Orden.',
        });
      }
    }

    const rawExpectedNorm =
      typeof expected_discord_username === 'string'
        ? normalizeDiscordUsername(expected_discord_username)
        : '';
    const normExpected = rawExpectedNorm.length > 0 ? rawExpectedNorm : null;

    if (normExpected) {
      const existingUnlinked = db
        .prepare(
          'SELECT id, expected_discord_username FROM users WHERE is_discord_linked = 0 AND expected_discord_username IS NOT NULL'
        )
        .all() as any[];
      const dup = existingUnlinked.find(
        (u) => normalizeDiscordUsername(u.expected_discord_username) === normExpected
      );
      if (dup) {
        return res.status(409).json({
          error: `Ya existe un expediente sin vincular esperando el usuario de Discord '${normExpected}'.`,
        });
      }
    }

    const newId = crypto.randomUUID();
    const placeholderDiscordId = `org_${crypto.randomUUID()}`;
    const fallbackSlug =
      normExpected ||
      cleanDisplay
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '_')
        .replace(/^_+|_+$/g, '') ||
      'hermano';

    const resolvedCargo =
      typeof cargo === 'string' && cargo.trim()
        ? cargo.trim()
        : `${targetRank.archetype} — ${targetRank.name}`;

    const specialtiesJson = JSON.stringify(Array.isArray(specialties) ? specialties : []);

    db.prepare(`
      INSERT INTO users (
        id, discord_id, discord_username, rsi_handle, display_name,
        status, role, rank_id, rank_level, cargo, specialties, bio,
        expected_discord_username, is_discord_linked, home_system, combat_role,
        approved_by, approved_at
      ) VALUES (?, ?, ?, ?, ?, 'approved', ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      newId,
      placeholderDiscordId,
      fallbackSlug,
      typeof rsi_handle === 'string' && rsi_handle.trim() ? rsi_handle.trim() : cleanDisplay,
      cleanDisplay,
      resolvedRole,
      targetRank.id,
      targetRank.level,
      resolvedCargo,
      specialtiesJson,
      typeof bio === 'string' && bio.trim()
        ? bio.trim()
        : `${targetRank.name} consagrado en los registros de la Ancalagon Oblivion Fleet.`,
      normExpected,
      typeof home_system === 'string' && home_system.trim() ? home_system.trim() : 'Pyro',
      typeof combat_role === 'string' && combat_role.trim() ? combat_role.trim() : 'Vanguardia',
      actorId
    );

    logCouncilAction(actorId, 'USER_PREREGISTERED', newId, {
      display_name: cleanDisplay,
      rank_id: targetRank.id,
      role: resolvedRole,
      expected_discord_username: normExpected,
    });

    const created = db.prepare('SELECT * FROM users WHERE id = ?').get(newId);
    res.status(201).json({
      success: true,
      message: `Expediente de ${cleanDisplay} pre-registrado en el Grimoire. IN NOMINI OBLIVIONIS.`,
      user: enrichCouncilUser(created),
    });
  });

  // 3. Fusionar cuenta Discord pendiente con expediente pre-registrado
  councilRouter.post('/users/:targetId/merge', requireCouncil, (req: AuthenticatedRequest, res: Response) => {
    const targetId = String(req.params.targetId || '');
    const { source_user_id } = req.body as { source_user_id?: string };
    const actorId = req.user!.userId;
    const actorRole = req.user!.role;

    if (!source_user_id || typeof source_user_id !== 'string') {
      return res.status(400).json({ error: 'Debes indicar source_user_id a fusionar.' });
    }
    if (source_user_id === targetId) {
      return res.status(400).json({ error: 'El origen y el destino de la fusión no pueden ser el mismo.' });
    }

    const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId) as any;
    if (!targetUser) return res.status(404).json({ error: 'Expediente destino no encontrado.' });

    const sourceUser = db.prepare('SELECT * FROM users WHERE id = ?').get(source_user_id) as any;
    if (!sourceUser) return res.status(404).json({ error: 'Cuenta origen no encontrada.' });

    const rbacTarget = assertCanManageTarget(actorRole, targetUser);
    if (rbacTarget) return res.status(403).json({ error: rbacTarget });

    const rbacSource = assertCanManageTarget(actorRole, sourceUser);
    if (rbacSource) return res.status(403).json({ error: rbacSource });

    try {
      const { user } = mergeUserIntoRoster(source_user_id, targetId, actorId, {
        allowAlreadyLinked: false,
        actionType: 'USER_MERGED',
      });
      res.json({
        success: true,
        message: `Cuenta de Discord vinculada y fusionada en el expediente de ${user.display_name}. IN NOMINI OBLIVIONIS.`,
        user: enrichCouncilUser(user),
      });
    } catch (err: unknown) {
      const statusCode = err instanceof HttpError ? err.statusCode : 400;
      const msg = err instanceof Error ? err.message : 'No se pudo completar la fusión.';
      res.status(statusCode).json({ error: msg });
    }
  });

  // 4. Desvincular Discord de un expediente (invalidando JWT previo)
  councilRouter.post('/users/:id/unlink-discord', requireCouncil, (req: AuthenticatedRequest, res: Response) => {
    const targetId = String(req.params.id || '');
    const actorId = req.user!.userId;
    const actorRole = req.user!.role;

    const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId) as any;
    if (!targetUser) return res.status(404).json({ error: 'Expediente no encontrado.' });

    if (targetId === actorId) {
      return res.status(400).json({ error: 'No puedes desvincular tu propia cuenta activa.' });
    }

    const rbacError = assertCanManageTarget(actorRole, targetUser);
    if (rbacError) return res.status(403).json({ error: rbacError });

    try {
      const updated = unlinkDiscordFromUser(targetId, actorId);
      res.json({
        success: true,
        message: `Discord desvinculado de ${updated.display_name}. Su sesión anterior ha sido revocada.`,
        user: enrichCouncilUser(updated),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo desvincular Discord.';
      res.status(400).json({ error: msg });
    }
  });

  // 5. Aprobar Candidato en el Ritual de Iniciación
  councilRouter.post('/users/:id/approve', requireCouncil, (req: AuthenticatedRequest, res: Response) => {
    const targetId = String(req.params.id || '');
    const councilId = req.user!.userId;
    const actorRole = req.user!.role;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId) as any;
    if (!user) return res.status(404).json({ error: 'Candidato no hallado en el Umbral' });

    if (user.status === 'approved') {
      return res.status(400).json({ error: 'Este hermano ya ha sido aprobado en la Hermandad.' });
    }

    const rbacError = assertCanManageTarget(actorRole, user, 'hermano', 1, councilId, 'approved');
    if (rbacError) return res.status(403).json({ error: rbacError });

    const cleanDisplay = String(user.display_name || '').trim();
    if (cleanDisplay) {
      const displayConflict = findApprovedIdentityConflict(targetId, cleanDisplay);
      if (displayConflict) {
        return res.status(409).json({
          error: `Ya existe un Hermano aprobado con el nombre o handle '${cleanDisplay}' (ID: ${displayConflict.id}). Fusiona esta cuenta con el expediente existente (POST /api/council/users/${displayConflict.id}/merge) o renombra el perfil antes de aprobar.`,
        });
      }
    }

    const cleanRsi =
      typeof user.rsi_handle === 'string' && user.rsi_handle.trim() ? user.rsi_handle.trim() : null;
    if (cleanRsi) {
      const rsiConflict = findApprovedIdentityConflict(targetId, cleanRsi);
      if (rsiConflict) {
        return res.status(409).json({
          error: `Ya existe un Hermano aprobado con el Handle RSI '${cleanRsi}' (ID: ${rsiConflict.id}). Fusiona esta cuenta con el expediente existente (POST /api/council/users/${rsiConflict.id}/merge) o cambia el Handle RSI antes de aprobar.`,
        });
      }
    }

    db.prepare(`
      UPDATE users
      SET status = 'approved',
          role = 'hermano',
          rank_id = 'sombras',
          rank_level = 1,
          cargo = 'El Neófito Hambriento — Sombra del Umbral',
          approved_by = ?,
          approved_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(councilId, targetId);

    logCouncilAction(councilId, 'USER_APPROVED', targetId, {
      display_name: user.display_name,
    });

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId);
    res.json({
      success: true,
      message: `${user.display_name} ha superado el juicio del Concilio del Vacío y ahora camina entre las Sombras del Umbral. IN NOMINI OBLIVIONIS.`,
      user: enrichCouncilUser(updated),
    });
  });

  // 6. Rechazar candidato -> La Ceniza Fría
  councilRouter.post('/users/:id/reject', requireCouncil, (req: AuthenticatedRequest, res: Response) => {
    const targetId = String(req.params.id || '');
    const actorId = req.user!.userId;
    const actorRole = req.user!.role;

    if (targetId === actorId) {
      return res.status(400).json({ error: 'No puedes arrojarte a ti mismo a La Ceniza Fría.' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId) as any;
    if (!user) return res.status(404).json({ error: 'Candidato no hallado en el Umbral' });

    const rbacError = assertCanManageTarget(actorRole, user, undefined, undefined, actorId, 'rejected');
    if (rbacError) return res.status(403).json({ error: rbacError });

    db.prepare(`
      UPDATE users
      SET status = 'rejected',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(targetId);

    logCouncilAction(actorId, 'USER_REJECTED', targetId, {
      display_name: user.display_name,
    });

    res.json({ success: true, message: 'El candidato ha sido arrojado a La Ceniza Fría.' });
  });

  // 7. Edición completa de expediente por Consejo / Admin
  councilRouter.patch('/users/:id', requireCouncil, (req: AuthenticatedRequest, res: Response) => {
    const targetId = String(req.params.id || '');
    const actorId = req.user!.userId;
    const actorRole = req.user!.role;

    const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId) as any;
    if (!targetUser) return res.status(404).json({ error: 'Hermano no encontrado en el registro sagrado' });

    const {
      rank_id,
      role,
      cargo,
      rsi_handle,
      display_name,
      expected_discord_username,
      status,
      home_system,
      combat_role,
      bio,
      specialties,
    } = req.body;

    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Estado '${status}' inválido.` });
    }
    if (role !== undefined && !VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: `Rol '${role}' inválido.` });
    }

    let resolvedRankLevel: number | undefined;
    let resolvedRankId: string | undefined;
    if (rank_id !== undefined) {
      if (rank_id === 'candidato') {
        resolvedRankId = CANDIDATO_UMBRAL.id;
        resolvedRankLevel = CANDIDATO_UMBRAL.level;
      } else {
        const found = ESCALA_DEL_ABISMO.find((r) => r.id === rank_id);
        if (!found) {
          return res.status(400).json({ error: `Rango '${rank_id}' no existe en La Escala del Abismo.` });
        }
        resolvedRankId = found.id;
        resolvedRankLevel = found.level;
      }
    }

    if (targetId === 'usr-quaker-heraldo') {
      if (role !== undefined && role !== 'admin') {
        return res.status(403).json({ error: 'El Heraldo de Ancalagon no puede perder el rol admin.' });
      }
      if (status !== undefined && status !== 'approved') {
        return res.status(403).json({ error: 'El Heraldo de Ancalagon no puede ser suspendido ni rechazado.' });
      }
    }

    if (targetId === actorId) {
      if (status !== undefined && status !== 'approved') {
        return res.status(400).json({ error: 'No puedes suspenderte o rechazarte a ti mismo.' });
      }
      if (role !== undefined && role !== targetUser.role && targetUser.role === 'admin') {
        return res.status(400).json({ error: 'No puedes degradar tu propio rol de admin.' });
      }
    }

    const rbacError = assertCanManageTarget(actorRole, targetUser, role, resolvedRankLevel, actorId, status);
    if (rbacError) return res.status(403).json({ error: rbacError });

    let nextExpectedDiscord: string | null | undefined;
    if (expected_discord_username !== undefined) {
      const norm =
        expected_discord_username === null
          ? ''
          : normalizeDiscordUsername(String(expected_discord_username));
      if (!norm) {
        nextExpectedDiscord = null;
      } else {
        const otherUnlinked = db
          .prepare(
            'SELECT id, expected_discord_username FROM users WHERE id != ? AND is_discord_linked = 0 AND expected_discord_username IS NOT NULL'
          )
          .all(targetId) as any[];
        const dup = otherUnlinked.find(
          (u) => normalizeDiscordUsername(u.expected_discord_username) === norm
        );
        if (dup) {
          return res.status(409).json({
            error: `Otro expediente sin vincular ya espera el usuario de Discord '${norm}'.`,
          });
        }
        nextExpectedDiscord = norm;
      }
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (resolvedRankId !== undefined && resolvedRankLevel !== undefined) {
      updates.push('rank_id = ?', 'rank_level = ?');
      params.push(resolvedRankId, resolvedRankLevel);
    }
    if (role !== undefined) {
      updates.push('role = ?');
      params.push(role);
    }
    if (cargo !== undefined) {
      updates.push('cargo = ?');
      params.push(String(cargo).trim() || targetUser.cargo);
    }
    if (rsi_handle !== undefined) {
      const cleanRsiHandle =
        typeof rsi_handle === 'string' && rsi_handle.trim() ? rsi_handle.trim() : null;
      if (cleanRsiHandle) {
        const rsiConflict = db
          .prepare(
            `SELECT id FROM users
             WHERE id != ?
               AND (LOWER(TRIM(COALESCE(rsi_handle, ''))) = LOWER(?) OR LOWER(TRIM(display_name)) = LOWER(?) OR LOWER(id) = LOWER(?))
             LIMIT 1`
          )
          .get(targetId, cleanRsiHandle, cleanRsiHandle, cleanRsiHandle);
        if (rsiConflict) {
          return res.status(409).json({
            error: 'Ese Handle RSI ya pertenece a otro Hermano de la Orden.',
          });
        }
      }
      updates.push('rsi_handle = ?');
      params.push(cleanRsiHandle);
    }
    if (display_name !== undefined) {
      const cleanName = typeof display_name === 'string' ? display_name.trim() : '';
      if (!cleanName) return res.status(400).json({ error: 'display_name no puede estar vacío.' });
      const nameConflict = db
        .prepare(
          `SELECT id FROM users
           WHERE id != ?
             AND (LOWER(TRIM(display_name)) = LOWER(?) OR LOWER(TRIM(COALESCE(rsi_handle, ''))) = LOWER(?) OR LOWER(id) = LOWER(?))
           LIMIT 1`
        )
        .get(targetId, cleanName, cleanName, cleanName);
      if (nameConflict) {
        return res.status(409).json({
          error: 'Ese nombre de Hermano ya está en uso en los registros.',
        });
      }
      updates.push('display_name = ?');
      params.push(cleanName);
    }
    if (nextExpectedDiscord !== undefined) {
      updates.push('expected_discord_username = ?');
      params.push(nextExpectedDiscord);
    }
    if (status !== undefined) {
      if (status === 'approved') {
        if (display_name === undefined) {
          const existingDisplay = String(targetUser.display_name || '').trim();
          if (existingDisplay) {
            const displayConflict = findApprovedIdentityConflict(targetId, existingDisplay);
            if (displayConflict) {
              return res.status(409).json({
                error: `Ya existe un Hermano aprobado con el nombre o handle '${existingDisplay}' (ID: ${displayConflict.id}). Fusiona esta cuenta con el expediente existente (POST /api/council/users/${displayConflict.id}/merge) o renombra el perfil antes de aprobar.`,
              });
            }
          }
        }
        if (rsi_handle === undefined) {
          const existingRsi =
            typeof targetUser.rsi_handle === 'string' && targetUser.rsi_handle.trim()
              ? targetUser.rsi_handle.trim()
              : null;
          if (existingRsi) {
            const rsiConflict = findApprovedIdentityConflict(targetId, existingRsi);
            if (rsiConflict) {
              return res.status(409).json({
                error: `Ya existe un Hermano aprobado con el Handle RSI '${existingRsi}' (ID: ${rsiConflict.id}). Fusiona esta cuenta con el expediente existente (POST /api/council/users/${rsiConflict.id}/merge) o cambia el Handle RSI antes de aprobar.`,
              });
            }
          }
        }
      }
      updates.push('status = ?');
      params.push(status);
      if (status === 'approved' && !targetUser.approved_at) {
        updates.push('approved_by = ?', 'approved_at = CURRENT_TIMESTAMP');
        params.push(actorId);
      }
    }
    if (home_system !== undefined) {
      updates.push('home_system = ?');
      params.push(String(home_system).trim() || 'Pyro');
    }
    if (combat_role !== undefined) {
      updates.push('combat_role = ?');
      params.push(String(combat_role).trim() || 'Vanguardia');
    }
    if (bio !== undefined) {
      updates.push('bio = ?');
      params.push(typeof bio === 'string' ? bio : null);
    }
    if (specialties !== undefined) {
      if (!Array.isArray(specialties)) {
        return res.status(400).json({ error: 'specialties debe ser un arreglo.' });
      }
      updates.push('specialties = ?');
      params.push(JSON.stringify(specialties));
    }

    if (updates.length > 0) {
      updates.push('updated_at = CURRENT_TIMESTAMP');
      params.push(targetId);
      db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);

      logCouncilAction(actorId, 'USER_UPDATED', targetId, {
        target_display_name: display_name || targetUser.display_name,
        updated_fields: Object.keys(req.body || {}),
      });
    }

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId);
    res.json({
      success: true,
      message: `Expediente de ${targetUser.display_name} actualizado por decreto del Concilio.`,
      user: enrichCouncilUser(updated),
    });
  });

  // 8. Ascender / cambiar rol (con fix de downgrade silencioso de admin -> consejo)
  const handlePromoteOrRole = (req: AuthenticatedRequest, res: Response) => {
    const targetId = String(req.params.id || '');
    const actorId = req.user!.userId;
    const actorRole = req.user!.role;
    const { rank_id, cargo, role, specialties } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId) as any;
    if (!user) return res.status(404).json({ error: 'Hermano no encontrado en el registro sagrado' });

    let targetRank: (typeof ESCALA_DEL_ABISMO)[number] | undefined;
    if (rank_id !== undefined) {
      targetRank = ESCALA_DEL_ABISMO.find((r) => r.id === rank_id);
      if (!targetRank) {
        return res.status(400).json({ error: `Rango '${rank_id}' no existe en La Escala del Abismo.` });
      }
    }

    if (role !== undefined && !VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: `Rol '${role}' inválido.` });
    }

    const rankLevel = targetRank ? targetRank.level : user.rank_level;

    // Preservar el rol existente si solo cambia cargo/specialties o si no cambió el rango;
    // preservar admin y jamás auto-escalar a admin si role fue omitido
    let nextRole: string | undefined = role;
    if (nextRole === undefined && targetRank && targetRank.id !== user.rank_id) {
      if (user.role === 'admin') {
        nextRole = 'admin';
      } else {
        const suggested = suggestRoleForRankLevel(targetRank.level);
        nextRole = suggested === 'admin' ? 'consejo' : suggested;
      }
    }

    if (targetId === 'usr-quaker-heraldo' && nextRole !== undefined && nextRole !== 'admin') {
      return res.status(403).json({ error: 'El Heraldo de Ancalagon no puede perder el rol admin.' });
    }

    if (targetId === actorId && nextRole !== undefined && nextRole !== user.role && user.role === 'admin') {
      return res.status(400).json({ error: 'No puedes degradar tu propio rol de admin.' });
    }

    const rbacError = assertCanManageTarget(actorRole, user, nextRole, rankLevel, actorId);
    if (rbacError) return res.status(403).json({ error: rbacError });

    const specialtiesJson = Array.isArray(specialties) ? JSON.stringify(specialties) : null;

    db.prepare(`
      UPDATE users
      SET rank_id = COALESCE(?, rank_id),
          rank_level = ?,
          cargo = COALESCE(?, cargo),
          role = COALESCE(?, role),
          specialties = COALESCE(?, specialties),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      rank_id || null,
      rankLevel,
      cargo || null,
      nextRole || null,
      specialtiesJson,
      targetId
    );

    const actionType = req.path.endsWith('/role') ? 'USER_ROLE_CHANGED' : 'USER_PROMOTED';
    logCouncilAction(actorId, actionType, targetId, {
      display_name: user.display_name,
      rank_id: rank_id || user.rank_id,
      role: nextRole || user.role,
      cargo: cargo || user.cargo,
    });

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId);
    res.json({
      success: true,
      message: `Por decreto del Concilio del Vacío, el rango y cargo de ${user.display_name} han sido grabados en piedra. IN NOMINI OBLIVIONIS.`,
      user: enrichCouncilUser(updated),
    });
  };

  councilRouter.patch('/users/:id/promote', requireCouncil, handlePromoteOrRole);
  councilRouter.patch('/users/:id/role', requireCouncil, handlePromoteOrRole);

  // 9. Marcas del Abismo (Condecoraciones)
  councilRouter.post('/users/:id/marks', requireCouncil, (req: AuthenticatedRequest, res: Response) => {
    const targetId = String(req.params.id || '');
    const actorId = req.user!.userId;
    const actorRole = req.user!.role;
    const { title, reason = '' } = req.body as { title?: string; reason?: string };

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'El título de la Marca del Abismo (title) es obligatorio.' });
    }

    const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId) as any;
    if (!targetUser) return res.status(404).json({ error: 'Hermano no encontrado.' });

    const rbacError = assertCanManageTarget(actorRole, targetUser);
    if (rbacError) return res.status(403).json({ error: rbacError });

    const markId = crypto.randomUUID();
    db.prepare(
      `INSERT INTO abyssal_marks (id, user_id, title, reason, awarded_by)
       VALUES (?, ?, ?, ?, ?)`
    ).run(markId, targetId, title.trim(), String(reason || '').trim(), actorId);

    logCouncilAction(actorId, 'MARK_GRANTED', targetId, {
      mark_id: markId,
      title: title.trim(),
      reason: String(reason || '').trim(),
    });

    const created = db
      .prepare(
        `SELECT m.*, a.display_name as awarded_by_name
         FROM abyssal_marks m
         LEFT JOIN users a ON m.awarded_by = a.id
         WHERE m.id = ?`
      )
      .get(markId);

    res.status(201).json({ success: true, mark: created });
  });

  councilRouter.delete('/marks/:markId', requireCouncil, (req: AuthenticatedRequest, res: Response) => {
    const markId = String(req.params.markId || '');
    const actorId = req.user!.userId;
    const actorRole = req.user!.role;

    const mark = db.prepare('SELECT * FROM abyssal_marks WHERE id = ?').get(markId) as any;
    if (!mark) return res.status(404).json({ error: 'Marca del Abismo no encontrada.' });

    const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(mark.user_id) as any;
    if (targetUser) {
      const rbacError = assertCanManageTarget(actorRole, targetUser);
      if (rbacError) return res.status(403).json({ error: rbacError });
    }

    db.prepare('DELETE FROM abyssal_marks WHERE id = ?').run(markId);
    logCouncilAction(actorId, 'MARK_REVOKED', mark.user_id, {
      mark_id: markId,
      title: mark.title,
    });

    res.json({ success: true, message: 'Marca del Abismo revocada.' });
  });

  // 10. Gobernanza de Veredictos
  councilRouter.get('/verdicts', requireCouncil, (_req: AuthenticatedRequest, res: Response) => {
    const rows = db.prepare('SELECT * FROM verdicts ORDER BY closed_at DESC').all() as any[];
    const verdicts = rows.map((v) => ({
      ...v,
      featured_in_home: Boolean(v.featured_in_home),
    }));
    res.json({ verdicts });
  });

  councilRouter.patch('/verdicts/:id', requireCouncil, (req: AuthenticatedRequest, res: Response) => {
    const id = String(req.params.id || '');
    const existing = db.prepare('SELECT * FROM verdicts WHERE id = ?').get(id) as any;
    if (!existing) return res.status(404).json({ error: 'Veredicto no encontrado.' });

    const { featured_in_home, summary, action_taken, title } = req.body;
    const updates: string[] = [];
    const params: any[] = [];

    if (featured_in_home !== undefined) {
      updates.push('featured_in_home = ?');
      params.push(featured_in_home ? 1 : 0);
    }
    if (summary !== undefined) {
      updates.push('summary = ?');
      params.push(String(summary));
    }
    if (action_taken !== undefined) {
      updates.push('action_taken = ?');
      params.push(String(action_taken));
    }
    if (title !== undefined) {
      const cleanTitle = String(title).trim();
      if (!cleanTitle) return res.status(400).json({ error: 'title no puede estar vacío.' });
      updates.push('title = ?');
      params.push(cleanTitle);
    }

    if (updates.length > 0) {
      params.push(id);
      db.prepare(`UPDATE verdicts SET ${updates.join(', ')} WHERE id = ?`).run(...params);
      logCouncilAction(req.user!.userId, 'VERDICT_UPDATED', null, {
        verdict_id: id,
        updated_fields: Object.keys(req.body || {}),
      });
    }

    const updated = db.prepare('SELECT * FROM verdicts WHERE id = ?').get(id) as any;
    res.json({
      success: true,
      verdict: updated
        ? { ...updated, featured_in_home: Boolean(updated.featured_in_home) }
        : null,
    });
  });

  councilRouter.delete('/verdicts/:id', requireCouncil, (req: AuthenticatedRequest, res: Response) => {
    const id = String(req.params.id || '');
    const existing = db.prepare('SELECT * FROM verdicts WHERE id = ?').get(id) as any;
    if (!existing) return res.status(404).json({ error: 'Veredicto no encontrado.' });

    db.prepare('DELETE FROM verdicts WHERE id = ?').run(id);
    logCouncilAction(req.user!.userId, 'VERDICT_DELETED', null, {
      verdict_id: id,
      title: existing.title,
    });

    res.json({ success: true, message: 'Veredicto retirado de los registros.' });
  });

  // 11. Gobernanza de Crónicas Sagradas (Lectitio Divinitatus)
  councilRouter.get('/chronicles', requireCouncil, async (_req: AuthenticatedRequest, res: Response) => {
    const chronicles = await repository.getAllChronicles();
    res.json({ chronicles });
  });

  councilRouter.post('/chronicles', requireCouncil, async (req: AuthenticatedRequest, res: Response) => {
    const check = validateChronicleInput(req.body);
    if (check.error) {
      return res.status(400).json({ error: check.error });
    }

    const {
      title,
      subtitle = 'TESTIMONIO DEL VACÍO',
      date = 'Ciclo 2956',
      dateSort,
      classification = 'Crónica Sagrada',
      icon = 'dragon',
      color = 'var(--secondary)',
    } = req.body;

    const saved = await repository.saveChronicle({
      title: String(title).trim(),
      subtitle: String(subtitle),
      date: String(date),
      dateSort: typeof dateSort === 'number' ? dateSort : Date.now(),
      classification: String(classification),
      icon: String(icon),
      color: String(color),
      blocks: check.blocks,
    });

    logCouncilAction(req.user!.userId, 'CHRONICLE_CREATED', null, {
      chronicle_id: saved.id,
      title: saved.title,
    });

    res.status(201).json({ success: true, chronicle: saved });
  });

  councilRouter.put('/chronicles/:id', requireCouncil, async (req: AuthenticatedRequest, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'ID de Crónica inválido.' });
    }

    const all = await repository.getAllChronicles();
    const existing = all.find((c: any) => Number(c.id) === id);
    if (!existing) {
      return res.status(404).json({ error: 'Crónica Sagrada no hallada en el Lectitio Divinitatus.' });
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const hasBodyBlocks = body.blocks !== undefined;
    const hasBodyParagraphs = body.paragraphs !== undefined;

    const mergedPayload = {
      ...existing,
      ...body,
      ...(hasBodyParagraphs && !hasBodyBlocks ? { blocks: undefined } : {}),
      ...(hasBodyBlocks && !hasBodyParagraphs ? { paragraphs: undefined } : {}),
    };

    const check = validateChronicleInput(mergedPayload);
    if (check.error) {
      return res.status(400).json({ error: check.error });
    }

    const {
      title,
      subtitle = existing.subtitle,
      date = existing.date,
      dateSort = existing.dateSort,
      classification = existing.classification,
      icon = existing.icon,
      color = existing.color,
    } = mergedPayload;

    const saved = await repository.saveChronicle({
      id,
      title: String(title).trim(),
      subtitle: String(subtitle),
      date: String(date),
      dateSort: typeof dateSort === 'number' ? dateSort : existing.dateSort,
      classification: String(classification),
      icon: String(icon),
      color: String(color),
      blocks: check.blocks,
    });

    logCouncilAction(req.user!.userId, 'CHRONICLE_UPDATED', null, {
      chronicle_id: saved.id,
      title: saved.title,
    });

    res.json({ success: true, chronicle: saved });
  });

  councilRouter.delete('/chronicles/:id', requireCouncil, async (req: AuthenticatedRequest, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'ID de Crónica inválido.' });
    }

    const deleted = await repository.deleteChronicle(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Crónica Sagrada no hallada en el Lectitio Divinitatus.' });
    }

    logCouncilAction(req.user!.userId, 'CHRONICLE_DELETED', null, { chronicle_id: id });
    res.json({ success: true, message: 'Crónica Sagrada removida del Lectitio Divinitatus.' });
  });

  // 12. Bitácora de Auditoría del Concilio
  councilRouter.get('/audit-logs', requireCouncil, (req: AuthenticatedRequest, res: Response) => {
    const { action_type, actor_id, target_user_id } = req.query as Record<string, string | undefined>;
    const rawLimit = Number(req.query.limit ?? 100);
    const limit = Math.max(1, Math.min(500, Number.isFinite(rawLimit) ? rawLimit : 100));

    let query = `
      SELECT l.*,
             actor.display_name as actor_name,
             actor.cargo as actor_cargo,
             target.display_name as target_name
      FROM council_audit_log l
      LEFT JOIN users actor ON l.actor_id = actor.id
      LEFT JOIN users target ON l.target_user_id = target.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (action_type) {
      query += ' AND l.action_type = ?';
      params.push(action_type);
    }
    if (actor_id) {
      query += ' AND l.actor_id = ?';
      params.push(actor_id);
    }
    if (target_user_id) {
      query += ' AND l.target_user_id = ?';
      params.push(target_user_id);
    }

    query += ' ORDER BY l.created_at DESC, l.rowid DESC LIMIT ?';
    params.push(limit);

    const logs = db.prepare(query).all(...params);
    res.json({ logs });
  });

  return councilRouter;
}
