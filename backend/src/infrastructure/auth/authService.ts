import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { db } from '../database/sqlite.js';

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

  const discordUser = (await userResponse.json()) as {
    id: string;
    username: string;
    global_name?: string;
    discriminator?: string;
    avatar?: string;
  };

  const avatarUrl = discordUser.avatar
    ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
    : null;

  let user = db
    .prepare('SELECT * FROM users WHERE discord_id = ?')
    .get(discordUser.id) as any;

  if (!user) {
    const displayName = discordUser.global_name || discordUser.username;

    // Si el miembro pertenece al Roster Oficial pre-registrado, vincular su cuenta real de Discord a su expediente canónico
    const rosterMatch = db
      .prepare(
        'SELECT * FROM users WHERE LOWER(display_name) = LOWER(?) OR LOWER(rsi_handle) = LOWER(?) OR LOWER(discord_username) = LOWER(?)'
      )
      .get(displayName, discordUser.username, discordUser.username) as any;

    if (rosterMatch) {
      db.prepare(`
        UPDATE users
        SET discord_id = ?,
            discord_username = ?,
            discord_discriminator = ?,
            discord_avatar = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        discordUser.id,
        discordUser.username,
        discordUser.discriminator || '0',
        avatarUrl,
        rosterMatch.id
      );
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(rosterMatch.id);
    } else {
      const newUserId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO users (
          id, discord_id, discord_username, discord_discriminator, discord_avatar,
          display_name, status, role, rank_id, rank_level, cargo, bio
        ) VALUES (?, ?, ?, ?, ?, ?, 'pending', 'neofito', 'candidato', 0, 'Candidato al Ritual de Iniciación', ?)
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
      SET discord_username = ?, discord_avatar = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(discordUser.username, avatarUrl, user.id);
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  }

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

  const lookupId = profileMap[roleType] || 'usr-enanimus-profeta';
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(lookupId) as any;

  if (user) {
    return signToken({
      userId: user.id,
      discordId: user.discord_id,
      role: user.role,
      status: user.status,
      rankLevel: user.rank_level,
    });
  }

  // Fallback si la BD estaba limpia
  const fallback = db.prepare('SELECT * FROM users ORDER BY rank_level DESC LIMIT 1').get() as any;
  return signToken({
    userId: fallback.id,
    discordId: fallback.discord_id,
    role: fallback.role,
    status: fallback.status,
    rankLevel: fallback.rank_level,
  });
}

// Vincula la cuenta actual de Discord de un usuario a un expediente canónico del Roster Oficial (ej. Quaker)
export function bindUserToRosterProfile(currentUserId: string, targetHandleOrId: string) {
  const sourceUser = db.prepare('SELECT * FROM users WHERE id = ?').get(currentUserId) as any;
  if (!sourceUser) {
    throw new Error('Usuario origen no encontrado.');
  }

  const targetRoster = db
    .prepare(
      `SELECT * FROM users
       WHERE (LOWER(display_name) = LOWER(?) OR LOWER(rsi_handle) = LOWER(?) OR id = ?)
         AND id LIKE 'usr-%'`
    )
    .get(targetHandleOrId, targetHandleOrId, targetHandleOrId) as any;

  if (!targetRoster) {
    throw new Error(`No se encontró el expediente canónico '${targetHandleOrId}' en el Roster Oficial.`);
  }

  if (sourceUser.id !== targetRoster.id) {
    const mergeTx = db.transaction(() => {
      db.prepare('UPDATE OR IGNORE altar_items SET user_id = ? WHERE user_id = ?').run(
        targetRoster.id,
        sourceUser.id
      );
      db.prepare('DELETE FROM altar_items WHERE user_id = ?').run(sourceUser.id);
      db.prepare('UPDATE OR IGNORE poll_votes SET user_id = ? WHERE user_id = ?').run(
        targetRoster.id,
        sourceUser.id
      );
      db.prepare('DELETE FROM poll_votes WHERE user_id = ?').run(sourceUser.id);
      db.prepare('DELETE FROM users WHERE id = ?').run(sourceUser.id);

      db.prepare(`
        UPDATE users
        SET discord_id = ?,
            discord_username = ?,
            discord_discriminator = ?,
            discord_avatar = COALESCE(?, discord_avatar),
            status = 'approved',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        sourceUser.discord_id,
        sourceUser.discord_username,
        sourceUser.discord_discriminator || '0',
        sourceUser.discord_avatar,
        targetRoster.id
      );
    });

    mergeTx();
  }

  const updatedTarget = db.prepare('SELECT * FROM users WHERE id = ?').get(targetRoster.id) as any;
  const token = signToken({
    userId: updatedTarget.id,
    discordId: updatedTarget.discord_id,
    role: updatedTarget.role,
    status: updatedTarget.status,
    rankLevel: updatedTarget.rank_level,
  });

  return { token, user: updatedTarget };
}
