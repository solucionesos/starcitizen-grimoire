import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { db } from '../database/sqlite.js';
import { HttpError, NotFoundError, assertCouncilAuthority } from './authMiddleware.js';

const JWT_SECRET = process.env.JWT_SECRET || 'ancalagon-oblivion-secret-key-2956';

export interface RankDefinition {
  id: string;
  level: number;
  name: string;
  title: string;
  archetype: string;
  description: string;
  color: string;
}

// Los 6 Rangos Canónicos de La Escala del Abismo (Codex Oblivionis Parte V §5.1)
export const ESCALA_DEL_ABISMO: RankDefinition[] = [
  {
    id: 'sombras',
    level: 1,
    name: 'Sombras del Umbral',
    title: 'Sombras del Umbral',
    archetype: 'El Neófito Hambriento',
    description:
      'Recién admitidos que aún llevan el polvo del mundo ordinario. Observan, aprenden y sirven en silencio hasta ser dignos del Ritual.',
    color: '#6b7280',
  },
  {
    id: 'iniciados',
    level: 2,
    name: 'Iniciados del Vacío',
    title: 'Iniciados del Vacío',
    archetype: 'El Converso',
    description:
      'Han pasado el Ritual de Iniciación, jurado lealtad al Abismo y recibido su primera asignación en la flota.',
    color: '#8b0000',
  },
  {
    id: 'portadores',
    level: 3,
    name: 'Portadores de Ceniza',
    title: 'Portadores de Ceniza',
    archetype: 'El Veterano Silencioso',
    description:
      'Miembros probados en combate y operaciones. Llevan las cicatrices del Vacío con orgullo frío. Columna vertebral de la flota.',
    color: '#b8860b',
  },
  {
    id: 'voces',
    level: 4,
    name: 'Voces del Abismo',
    title: 'Voces del Abismo',
    archetype: 'El Filósofo-Guerrero',
    description:
      'Comandantes de escuadrón, maestros de doctrina, mentores de los rangos inferiores. Hablan con la autoridad del Vacío.',
    color: '#c41e3a',
  },
  {
    id: 'profetas',
    level: 5,
    name: 'Profetas de la Ruina',
    title: 'Profetas de la Ruina',
    archetype: 'El Estratega Oscuro',
    description:
      'El Concilio del Vacío. Arquitectos de las grandes campañas, guardianes del Códice Sagrado, jueces de la fe y la traición.',
    color: '#9b59b6',
  },
  {
    id: 'heraldo',
    level: 6,
    name: 'Heraldo de Ancalagon',
    title: 'Heraldo de Ancalagon',
    archetype: 'La Voz del Dragón',
    description:
      'La cúspide. Quien interpreta la voluntad del Dragón Negro y guía a toda la flota hacia su destino final.',
    color: '#d4af37',
  },
];

// Estado transitorio previo al primer rango para quienes esperan aprobación en el Umbral
export const CANDIDATO_UMBRAL: RankDefinition = {
  id: 'candidato',
  level: 0,
  name: 'Candidato al Ritual de Iniciación',
  title: 'Candidato al Ritual de Iniciación',
  archetype: 'Alma en el Umbral',
  description:
    'Aguarda en la oscuridad exterior a que el Concilio del Vacío juzgue su valía y le permita cruzar hacia las Sombras del Umbral.',
  color: '#4b5563',
};

export function resolveUserRank(rankId: string, status: string): RankDefinition {
  if (status !== 'approved' || rankId === 'candidato' || rankId === 'neofito') {
    return CANDIDATO_UMBRAL;
  }
  return ESCALA_DEL_ABISMO.find((r) => r.id === rankId) || ESCALA_DEL_ABISMO[0];
}

export interface JwtPayload {
  userId: string;
  discordId: string;
  role: string;
  status: string;
  rankLevel: number;
}

export type UserSessionPayload = JwtPayload;

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function normalizeDiscordHandle(handle: string | null | undefined): string | null {
  if (!handle) return null;
  const cleaned = String(handle).trim().replace(/^@+/, '').replace(/#0$/, '').trim();
  return cleaned.length > 0 ? cleaned : null;
}

export function normalizeDiscordUsername(raw: string): string {
  return String(raw || '')
    .trim()
    .replace(/^@+/, '')
    .replace(/#0$/, '')
    .trim()
    .toLowerCase();
}

export function suggestRoleForRankLevel(level: number): string {
  if (level >= 5) return 'consejo';
  if (level === 4) return 'oficial';
  if (level >= 1) return 'hermano';
  return 'neofito';
}

export function logCouncilAction(
  actorId: string | null,
  actionType: string,
  targetUserId: string | null,
  details: Record<string, unknown> | string
): void {
  const id = crypto.randomUUID();
  const serialized = typeof details === 'string' ? details : JSON.stringify(details);
  db.prepare(
    `INSERT INTO council_audit_log (id, actor_id, action_type, target_user_id, details)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, actorId || null, actionType, targetUserId || null, serialized);
}

export interface DiscordUserProfile {
  id: string;
  username: string;
  global_name?: string;
  discriminator?: string;
  avatar?: string;
}

export function resolveOrCreateDiscordUser(discordUser: DiscordUserProfile) {
  const avatarUrl = discordUser.avatar
    ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
    : null;

  let user = db
    .prepare('SELECT * FROM users WHERE discord_id = ?')
    .get(discordUser.id) as any;

  if (!user) {
    const displayName = discordUser.global_name || discordUser.username;
    const normUsername = normalizeDiscordUsername(discordUser.username);
    const normWithDisc =
      discordUser.discriminator && discordUser.discriminator !== '0'
        ? normalizeDiscordUsername(`${discordUser.username}#${discordUser.discriminator}`)
        : normUsername;

    const candidates = db
      .prepare(
        `SELECT * FROM users
         WHERE is_discord_linked = 0
           AND expected_discord_username IS NOT NULL
           AND TRIM(expected_discord_username) != ''
         ORDER BY rank_level DESC, created_at ASC`
      )
      .all() as any[];

    const rosterMatch = candidates.find((row) => {
      const expectedNorm = normalizeDiscordUsername(row.expected_discord_username);
      return expectedNorm.length > 0 && (expectedNorm === normUsername || expectedNorm === normWithDisc);
    });

    if (rosterMatch) {
      db.prepare(`
        UPDATE users
        SET discord_id = ?,
            discord_username = ?,
            discord_discriminator = ?,
            discord_avatar = COALESCE(?, discord_avatar),
            is_discord_linked = 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        discordUser.id,
        discordUser.username,
        discordUser.discriminator || '0',
        avatarUrl,
        rosterMatch.id
      );
      logCouncilAction(rosterMatch.id, 'AUTO_LINK_DISCORD', rosterMatch.id, {
        discord_id: discordUser.id,
        discord_username: discordUser.username,
      });
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(rosterMatch.id);
    } else {
      const newUserId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO users (
          id, discord_id, discord_username, discord_discriminator, discord_avatar,
          display_name, status, role, rank_id, rank_level, cargo, bio,
          is_discord_linked, home_system, combat_role
        ) VALUES (?, ?, ?, ?, ?, ?, 'pending', 'neofito', 'candidato', 0, 'Candidato al Ritual de Iniciación', ?, 1, 'Pyro', 'Vanguardia')
      `).run(
        newUserId,
        discordUser.id,
        discordUser.username,
        discordUser.discriminator || '0',
        avatarUrl,
        displayName,
        'Alma en espera del juicio del Concilio del Vacío para cruzar el Umbral.'
      );

      user = db.prepare('SELECT * FROM users WHERE id = ?').get(newUserId);
    }
  } else {
    db.prepare(`
      UPDATE users
      SET discord_username = ?,
          discord_discriminator = ?,
          discord_avatar = ?,
          is_discord_linked = 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(discordUser.username, discordUser.discriminator || '0', avatarUrl, user.id);
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  }

  return user;
}

export function getDiscordAuthUrl(): string {
  const clientId = process.env.DISCORD_CLIENT_ID || '';
  const redirectUri = encodeURIComponent(
    process.env.DISCORD_REDIRECT_URI || 'http://localhost:3001/api/auth/discord/callback'
  );
  const scope = encodeURIComponent('identify');
  return `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
}

export async function handleDiscordCallback(code: string) {
  const clientId = process.env.DISCORD_CLIENT_ID || '';
  const clientSecret = process.env.DISCORD_CLIENT_SECRET || '';
  const redirectUri =
    process.env.DISCORD_REDIRECT_URI || 'http://localhost:3001/api/auth/discord/callback';

  const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    const errText = await tokenResponse.text();
    throw new Error(`Discord token error: ${errText}`);
  }

  const tokenData = (await tokenResponse.json()) as { access_token: string };

  const userResponse = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!userResponse.ok) {
    throw new Error('Failed to fetch Discord user profile');
  }

  const discordUser = (await userResponse.json()) as DiscordUserProfile;
  const user = resolveOrCreateDiscordUser(discordUser);

  return signToken({
    userId: user.id,
    discordId: user.discord_id,
    role: user.role,
    status: user.status,
    rankLevel: user.rank_level,
  });
}

// Acceso rápido de desarrollo usando el Roster Oficial del Codex Oblivionis (Parte X)
export function devQuickLogin(roleType: 'consejo' | 'hermano' | 'neofito' | string) {
  // Permitir login directo por handle del Roster Oficial o por los 3 arquetipos de prueba
  const targetByHandle = db
    .prepare('SELECT * FROM users WHERE LOWER(display_name) = LOWER(?) OR id = ?')
    .get(roleType, roleType) as any;

  if (targetByHandle) {
    return signToken({
      userId: targetByHandle.id,
      discordId: targetByHandle.discord_id,
      role: targetByHandle.role,
      status: targetByHandle.status,
      rankLevel: targetByHandle.rank_level,
    });
  }

  const profileMap: Record<string, string> = {
    consejo: 'usr-enanimus-profeta',
    hermano: 'usr-afol86-voz',
    neofito: 'usr-candidato-umbral',
  };

  const lookupId = Object.prototype.hasOwnProperty.call(profileMap, roleType)
    ? profileMap[roleType]
    : null;
  const user = lookupId
    ? (db.prepare('SELECT * FROM users WHERE id = ?').get(lookupId) as any)
    : null;

  if (!user) {
    throw new NotFoundError(
      `No se encontró el expediente de desarrollo para '${roleType}'.`
    );
  }

  return signToken({
    userId: user.id,
    discordId: user.discord_id,
    role: user.role,
    status: user.status,
    rankLevel: user.rank_level,
  });
}

export interface MergeOptions {
  allowAlreadyLinked?: boolean;
  actionType?: string;
  skipAuthorityCheck?: boolean;
}

function parseJsonArraySafe(raw: string | null | undefined): any[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function mergeUserIntoRoster(
  sourceUserId: string,
  targetUserId: string,
  actorId: string | null,
  options?: MergeOptions
) {
  if (!sourceUserId || !targetUserId || sourceUserId === targetUserId) {
    throw new HttpError(400, 'No puedes fusionar un expediente consigo mismo.');
  }

  if (actorId && sourceUserId === actorId && !options?.skipAuthorityCheck) {
    throw new HttpError(400, 'No puedes fusionar tu propia sesión activa como cuenta origen desde el Concilio.');
  }

  const sourceUser = db.prepare('SELECT * FROM users WHERE id = ?').get(sourceUserId) as any;
  if (!sourceUser) {
    throw new HttpError(404, 'Usuario origen no encontrado.');
  }

  const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(targetUserId) as any;
  if (!targetUser) {
    throw new HttpError(404, 'Expediente destino no encontrado.');
  }

  if (sourceUser.id === 'usr-quaker-heraldo') {
    throw new HttpError(403, 'No se puede eliminar el expediente fundacional del Heraldo como origen de fusión.');
  }

  if (!options?.skipAuthorityCheck) {
    if (!actorId) {
      throw new HttpError(403, 'Se requiere un miembro autorizado del Concilio para ejecutar esta fusión.');
    }
    const actorUser = db.prepare('SELECT * FROM users WHERE id = ?').get(actorId) as any;
    if (!actorUser) {
      throw new HttpError(403, 'Actor del Concilio no hallado.');
    }
    assertCouncilAuthority({
      actorId: actorUser.id,
      actorRole: actorUser.role,
      targetUser: sourceUser,
    });
    assertCouncilAuthority({
      actorId: actorUser.id,
      actorRole: actorUser.role,
      targetUser: targetUser,
    });
  }

  const sourceDiscordId = String(sourceUser.discord_id || '');
  const sourceIsRealDiscord =
    Number(sourceUser.is_discord_linked) === 1 &&
    !sourceDiscordId.startsWith('roster_') &&
    !sourceDiscordId.startsWith('org_') &&
    !sourceDiscordId.startsWith('ancalagon_') &&
    !sourceDiscordId.startsWith('10000000000000000');

  if (!sourceIsRealDiscord) {
    throw new HttpError(400, 'La cuenta origen no posee un Discord real vinculado.');
  }

  if (!options?.allowAlreadyLinked && Number(targetUser.is_discord_linked) === 1) {
    throw new HttpError(
      409,
      'El expediente destino ya tiene una cuenta de Discord vinculada. Desvincúlala primero antes de fusionar.'
    );
  }

  const mergeTx = db.transaction(() => {
    const txTarget = db.prepare('SELECT * FROM users WHERE id = ?').get(targetUserId) as any;
    if (!txTarget) {
      throw new HttpError(404, 'Expediente destino no encontrado.');
    }

    if (txTarget.status === 'pending') {
      const findApprovedCollision = (candidateValue: string) =>
        db
          .prepare(
            `SELECT id, display_name FROM users
             WHERE id != ?
               AND id != ?
               AND status = 'approved'
               AND (
                 LOWER(TRIM(display_name)) = LOWER(?)
                 OR LOWER(TRIM(COALESCE(rsi_handle, ''))) = LOWER(?)
                 OR LOWER(id) = LOWER(?)
               )
             ORDER BY created_at ASC, rowid ASC
             LIMIT 1`
          )
          .get(targetUserId, sourceUserId, candidateValue, candidateValue, candidateValue) as
          | { id: string; display_name: string }
          | undefined;

      const cleanDisplay = String(txTarget.display_name || '').trim();
      if (cleanDisplay) {
        const displayConflict = findApprovedCollision(cleanDisplay);
        if (displayConflict) {
          throw new HttpError(
            409,
            `Ya existe un Hermano aprobado con el nombre o handle '${cleanDisplay}' (ID: ${displayConflict.id}). Fusiona esta cuenta directamente en el expediente existente (${displayConflict.display_name}, ID: ${displayConflict.id}) en lugar de promover un candidato duplicado.`
          );
        }
      }

      const cleanRsi =
        typeof txTarget.rsi_handle === 'string' && txTarget.rsi_handle.trim()
          ? txTarget.rsi_handle.trim()
          : null;
      if (cleanRsi) {
        const rsiConflict = findApprovedCollision(cleanRsi);
        if (rsiConflict) {
          throw new HttpError(
            409,
            `Ya existe un Hermano aprobado con el Handle RSI '${cleanRsi}' (ID: ${rsiConflict.id}). Fusiona esta cuenta directamente en el expediente existente (${rsiConflict.display_name}, ID: ${rsiConflict.id}) en lugar de promover un candidato duplicado.`
          );
        }
      }

      const cleanTargetId = String(txTarget.id || '').trim();
      if (cleanTargetId) {
        const idConflict = findApprovedCollision(cleanTargetId);
        if (idConflict) {
          throw new HttpError(
            409,
            `Ya existe un Hermano aprobado con identidad coincidente '${cleanTargetId}' (ID: ${idConflict.id}). Fusiona esta cuenta directamente en el expediente existente (${idConflict.display_name}, ID: ${idConflict.id}) en lugar de promover un candidato duplicado.`
          );
        }
      }
    }

    // 1. Merge altars JSON arrays by item id
    const sourceAltar = db
      .prepare('SELECT items FROM altars WHERE user_id = ?')
      .get(sourceUserId) as { items?: string } | undefined;
    const targetAltar = db
      .prepare('SELECT items FROM altars WHERE user_id = ?')
      .get(targetUserId) as { items?: string } | undefined;

    if (sourceAltar && targetAltar) {
      const targetItems = parseJsonArraySafe(targetAltar.items);
      const sourceItems = parseJsonArraySafe(sourceAltar.items);
      const mergedMap = new Map<string, any>();

      for (const item of targetItems) {
        const key = item && item.id !== undefined ? String(item.id) : JSON.stringify(item);
        mergedMap.set(key, { ...item });
      }
      for (const item of sourceItems) {
        const key = item && item.id !== undefined ? String(item.id) : JSON.stringify(item);
        const existing = mergedMap.get(key);
        if (existing && typeof existing === 'object' && typeof item === 'object') {
          if (typeof existing.quantity === 'number' && typeof item.quantity === 'number') {
            existing.quantity += item.quantity;
          } else if (typeof existing.count === 'number' && typeof item.count === 'number') {
            existing.count += item.count;
          }
          mergedMap.set(key, existing);
        } else {
          mergedMap.set(key, item);
        }
      }

      db.prepare(
        'UPDATE altars SET items = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?'
      ).run(JSON.stringify(Array.from(mergedMap.values())), targetUserId);
      db.prepare('DELETE FROM altars WHERE user_id = ?').run(sourceUserId);
    } else if (sourceAltar) {
      db.prepare('UPDATE altars SET user_id = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?').run(
        targetUserId,
        sourceUserId
      );
    }

    // 2. Deduplicated unique-constrained tables
    db.prepare('UPDATE OR IGNORE votes SET user_id = ? WHERE user_id = ?').run(
      targetUserId,
      sourceUserId
    );
    db.prepare('DELETE FROM votes WHERE user_id = ?').run(sourceUserId);

    db.prepare('UPDATE OR IGNORE crusade_signups SET user_id = ? WHERE user_id = ?').run(
      targetUserId,
      sourceUserId
    );
    db.prepare('DELETE FROM crusade_signups WHERE user_id = ?').run(sourceUserId);

    // 3. Migrate owned rows and user foreign keys
    db.prepare('UPDATE member_ships SET user_id = ? WHERE user_id = ?').run(
      targetUserId,
      sourceUserId
    );
    db.prepare('UPDATE abyssal_marks SET user_id = ? WHERE user_id = ?').run(
      targetUserId,
      sourceUserId
    );
    db.prepare('UPDATE abyssal_marks SET awarded_by = ? WHERE awarded_by = ?').run(
      targetUserId,
      sourceUserId
    );
    db.prepare('UPDATE objectives SET creator_id = ? WHERE creator_id = ?').run(
      targetUserId,
      sourceUserId
    );
    db.prepare('UPDATE objectives SET assigned_to = ? WHERE assigned_to = ?').run(
      targetUserId,
      sourceUserId
    );
    db.prepare('UPDATE objectives SET verified_by = ? WHERE verified_by = ?').run(
      targetUserId,
      sourceUserId
    );
    db.prepare('UPDATE crusades SET creator_id = ? WHERE creator_id = ?').run(
      targetUserId,
      sourceUserId
    );
    db.prepare('UPDATE polls SET creator_id = ? WHERE creator_id = ?').run(
      targetUserId,
      sourceUserId
    );
    db.prepare('UPDATE users SET approved_by = ? WHERE approved_by = ?').run(
      targetUserId,
      sourceUserId
    );
    db.prepare('UPDATE council_audit_log SET actor_id = ? WHERE actor_id = ?').run(
      targetUserId,
      sourceUserId
    );
    db.prepare('UPDATE council_audit_log SET target_user_id = ? WHERE target_user_id = ?').run(
      targetUserId,
      sourceUserId
    );

    // 4. Delete source user BEFORE assigning its discord_id to targetUser (avoids UNIQUE collision)
    db.prepare('DELETE FROM users WHERE id = ?').run(sourceUserId);

    // 5. Bind Discord credentials to targetUser
    const effectiveActorId = actorId === sourceUserId ? targetUserId : actorId;
    db.prepare(`
      UPDATE users
      SET discord_id = ?,
          discord_username = ?,
          discord_discriminator = ?,
          discord_avatar = COALESCE(?, discord_avatar),
          is_discord_linked = 1,
          expected_discord_username = COALESCE(expected_discord_username, ?),
          status = CASE WHEN status = 'pending' THEN 'approved' ELSE status END,
          rank_id = CASE WHEN status = 'pending' AND (rank_id = 'candidato' OR rank_level = 0) THEN 'sombras' ELSE rank_id END,
          rank_level = CASE WHEN status = 'pending' AND (rank_id = 'candidato' OR rank_level = 0) THEN 1 ELSE rank_level END,
          role = CASE WHEN status = 'pending' AND (rank_id = 'candidato' OR rank_level = 0) AND role = 'neofito' THEN 'hermano' ELSE role END,
          cargo = CASE WHEN status = 'pending' AND (rank_id = 'candidato' OR rank_level = 0) THEN 'El Neófito Hambriento — Sombra del Umbral' ELSE cargo END,
          approved_by = CASE WHEN status = 'pending' THEN ? ELSE approved_by END,
          approved_at = CASE WHEN status = 'pending' THEN CURRENT_TIMESTAMP ELSE approved_at END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      sourceUser.discord_id,
      sourceUser.discord_username,
      sourceUser.discord_discriminator || '0',
      sourceUser.discord_avatar,
      sourceUser.discord_username,
      effectiveActorId,
      targetUserId
    );

    // 6. Audit log
    logCouncilAction(effectiveActorId, options?.actionType || 'MERGE_DISCORD', targetUserId, {
      source_user_id: sourceUserId,
      source_display_name: sourceUser.display_name,
      source_discord_id: sourceUser.discord_id,
      source_discord_username: sourceUser.discord_username,
      target_display_name: targetUser.display_name,
    });
  });

  mergeTx();

  const updatedTarget = db.prepare('SELECT * FROM users WHERE id = ?').get(targetUserId) as any;
  const token = signToken({
    userId: updatedTarget.id,
    discordId: updatedTarget.discord_id,
    role: updatedTarget.role,
    status: updatedTarget.status,
    rankLevel: updatedTarget.rank_level,
  });

  return { token, user: updatedTarget };
}

export function unlinkDiscordFromUser(targetUserId: string, actorId: string) {
  if (targetUserId === actorId) {
    throw new HttpError(400, 'No puedes desvincular tu propia cuenta de Discord activa.');
  }

  const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(targetUserId) as any;
  if (!targetUser) {
    throw new HttpError(404, 'Expediente no encontrado.');
  }

  const actorUser = db.prepare('SELECT * FROM users WHERE id = ?').get(actorId) as any;
  if (!actorUser) {
    throw new HttpError(403, 'Actor del Concilio no hallado.');
  }

  assertCouncilAuthority({
    actorId: actorUser.id,
    actorRole: actorUser.role,
    targetUser,
  });

  if (Number(targetUser.is_discord_linked) !== 1) {
    throw new HttpError(400, 'Este expediente no tiene una cuenta de Discord vinculada actualmente.');
  }

  const newPlaceholderId = `org_unlinked_${crypto.randomUUID()}`;
  const fallbackUsername =
    String(targetUser.rsi_handle || targetUser.display_name || 'sin_vincular').trim() || 'sin_vincular';

  const unlinkTx = db.transaction(() => {
    db.prepare(`
      UPDATE users
      SET discord_id = ?,
          discord_username = ?,
          discord_discriminator = NULL,
          discord_avatar = NULL,
          expected_discord_username = NULL,
          is_discord_linked = 0,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newPlaceholderId, fallbackUsername, targetUserId);

    logCouncilAction(actorId, 'DISCORD_UNLINKED', targetUserId, {
      previous_discord_id: targetUser.discord_id,
      previous_discord_username: targetUser.discord_username,
      target_display_name: targetUser.display_name,
    });
  });

  unlinkTx();

  return db.prepare('SELECT * FROM users WHERE id = ?').get(targetUserId) as any;
}

// Vincula la cuenta actual de Discord de un usuario a un expediente canónico del Roster Oficial (ej. Quaker)
export function bindUserToRosterProfile(currentUserId: string, targetHandleOrId: string) {
  const sourceUser = db.prepare('SELECT * FROM users WHERE id = ?').get(currentUserId) as any;
  if (!sourceUser) {
    throw new HttpError(404, 'Usuario origen no encontrado.');
  }

  const targetRoster = db
    .prepare(
      `SELECT * FROM users
       WHERE (LOWER(display_name) = LOWER(?) OR LOWER(rsi_handle) = LOWER(?) OR id = ?)
         AND id LIKE 'usr-%'`
    )
    .get(targetHandleOrId, targetHandleOrId, targetHandleOrId) as any;

  if (!targetRoster) {
    throw new HttpError(
      404,
      `No se encontró el expediente canónico '${targetHandleOrId}' en el Roster Oficial.`
    );
  }

  if (sourceUser.id === targetRoster.id) {
    const token = signToken({
      userId: targetRoster.id,
      discordId: targetRoster.discord_id,
      role: targetRoster.role,
      status: targetRoster.status,
      rankLevel: targetRoster.rank_level,
    });
    return { token, user: targetRoster };
  }

  return mergeUserIntoRoster(sourceUser.id, targetRoster.id, currentUserId, {
    allowAlreadyLinked: true,
    actionType: 'RESCUE_CLAIM_ROSTER',
    skipAuthorityCheck: true,
  });
}
