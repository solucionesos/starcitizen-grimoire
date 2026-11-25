import { Router, Request, Response } from 'express';
import {
  getDiscordAuthUrl,
  handleDiscordCallback,
  devQuickLogin,
  bindUserToRosterProfile,
  ESCALA_DEL_ABISMO,
  resolveUserRank,
} from '../auth/authService.js';
import {
  requireAuth,
  requireApproved,
  getAgentSyncToken,
  HttpError,
  AuthenticatedRequest,
} from '../auth/authMiddleware.js';
import { db } from '../database/sqlite.js';

export const authRouter = Router();

authRouter.get('/discord', (req: Request, res: Response) => {
  if (!process.env.DISCORD_CLIENT_ID || process.env.DISCORD_CLIENT_ID === 'your_discord_client_id') {
    return res.status(400).json({
      error: 'Discord Client ID no configurado en el servidor.',
      note: 'Puedes usar el inicio de sesión del Roster Oficial para pruebas.',
    });
  }
  const url = getDiscordAuthUrl();
  res.redirect(url);
});

authRouter.get('/discord/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string;
  if (!code) {
    return res.status(400).send('Código de autorización de Discord ausente.');
  }

  try {
    const token = await handleDiscordCallback(code);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.cookie('ancalagon_token', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.redirect(`${frontendUrl}/?token=${token}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error en autenticación con Discord';
    console.error('[Discord OAuth Error]', msg);
    res.status(500).send(`Error autenticando con Discord: ${msg}`);
  }
});

// Configuración pública de autenticación (oculta botones de simulación cuando NODE_ENV=production)
authRouter.get('/config', (_req: Request, res: Response) => {
  const isProd = process.env.NODE_ENV === 'production';
  const devLoginEnabled = isProd
    ? process.env.ENABLE_DEV_LOGIN === 'true'
    : process.env.ENABLE_DEV_LOGIN !== 'false';
  res.json({ devLoginEnabled });
});

// Acceso rápido de desarrollo (deshabilitado automáticamente en producción)
authRouter.post('/dev-login', (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_DEV_LOGIN !== 'true') {
    return res.status(403).json({ error: 'El acceso de simulación está deshabilitado en producción.' });
  }
  const role = req.body.role as string;
  if (!role) {
    return res.status(400).json({ error: 'Identificador de miembro o rol requerido.' });
  }

  const token = devQuickLogin(role);
  res.cookie('ancalagon_token', token, {
    httpOnly: false,
    secure: false,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({ success: true, token });
});

// Reclamar un expediente canónico del Roster Oficial (ej. Quaker - La Voz del Dragón) tras enlazar Discord
authRouter.post('/claim-roster', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { handle, secret } = req.body as { handle?: string; secret?: string };
  const expectedSecret = getAgentSyncToken();

  if (!secret || secret.trim() !== expectedSecret) {
    return res.status(403).json({
      error: 'Sello del Oráculo inválido. No tienes autorización para reclamar este expediente.',
    });
  }

  if (!handle) {
    return res.status(400).json({ error: 'Debes indicar el expediente del Roster a reclamar (ej. Quaker).' });
  }

  try {
    const userId = req.user?.userId || '';
    const { token, user } = bindUserToRosterProfile(userId, handle.trim());

    res.cookie('ancalagon_token', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      token,
      message: `Tu cuenta de Discord ha sido consagrada en el expediente de ${user.display_name} (${user.cargo}).`,
    });
  } catch (err: unknown) {
    const statusCode = err instanceof HttpError ? err.statusCode : 400;
    const msg = err instanceof Error ? err.message : 'Error vinculando expediente.';
    res.status(statusCode).json({ error: msg });
  }
});

// Lista pública de rangos de La Escala del Abismo
authRouter.get('/ranks', (_req: Request, res: Response) => {
  res.json(ESCALA_DEL_ABISMO);
});

// Roster activo de Hermanos consagrados (para selectores de asignación de Designios y consulta)
authRouter.get('/roster', requireApproved, (_req: AuthenticatedRequest, res: Response) => {
  const brothers = db
    .prepare(
      `SELECT id, display_name, rsi_handle, discord_avatar, role, rank_id, rank_level, cargo, specialties,
              home_system, combat_role, is_discord_linked
       FROM users
       WHERE status = 'approved'
       ORDER BY rank_level DESC, display_name ASC`
    )
    .all() as any[];

  const enriched = brothers.map((u) => {
    let parsedSpecialties: string[] = [];
    if (u.specialties) {
      try {
        const p = JSON.parse(u.specialties);
        if (Array.isArray(p)) parsedSpecialties = p;
      } catch {
        parsedSpecialties = [];
      }
    }
    return {
      ...u,
      is_discord_linked: Boolean(u.is_discord_linked),
      home_system: u.home_system || 'Pyro',
      combat_role: u.combat_role || 'Vanguardia',
      rank: resolveUserRank(u.rank_id, 'approved'),
      specialties: parsedSpecialties,
    };
  });

  res.json(enriched);
});

function buildSelfProfile(user: any) {
  const currentRank = resolveUserRank(user.rank_id, user.status);
  const marks = db
    .prepare(
      `SELECT m.*, a.display_name as awarded_by_name
       FROM abyssal_marks m
       LEFT JOIN users a ON m.awarded_by = a.id
       WHERE m.user_id = ?
       ORDER BY m.created_at DESC`
    )
    .all(user.id);
  const ships = db
    .prepare('SELECT * FROM member_ships WHERE user_id = ? ORDER BY created_at DESC')
    .all(user.id);

  let parsedSpecialties: string[] = [];
  if (user.specialties) {
    try {
      const parsed = JSON.parse(user.specialties);
      if (Array.isArray(parsed)) parsedSpecialties = parsed;
    } catch {
      parsedSpecialties = [];
    }
  }

  return {
    id: user.id,
    discord_id: user.discord_id,
    discord_username: user.discord_username,
    discord_avatar: user.discord_avatar,
    display_name: user.display_name,
    rsi_handle: user.rsi_handle,
    status: user.status,
    role: user.role,
    rank: currentRank,
    rank_id: user.rank_id,
    rank_level: user.rank_level,
    cargo: user.cargo,
    specialties: parsedSpecialties,
    bio: user.bio,
    expected_discord_username: user.expected_discord_username || null,
    is_discord_linked: Boolean(user.is_discord_linked),
    home_system: user.home_system || 'Pyro',
    combat_role: user.combat_role || 'Vanguardia',
    abyssal_marks: marks,
    ships,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

// Perfil actual del Hermano (forma plana BrotherProfile esperada por AuthContext.tsx)
authRouter.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user?.fullUser;
  if (!user) return res.status(404).json({ error: 'Hermano no encontrado en los registros.' });

  res.json(buildSelfProfile(user));
});

// Actualizar expediente propio (whitelist estricta: ignora role, status, rank_id, rank_level, etc.)
authRouter.patch('/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user?.fullUser;
  if (!currentUser) {
    return res.status(404).json({ error: 'Hermano no encontrado en los registros.' });
  }
  if (['suspended', 'rejected'].includes(String(currentUser.status))) {
    return res.status(403).json({
      error: 'Tu expediente ha sido suspendido o rechazado por el Concilio y no puede ser editado.',
    });
  }

  const { rsi_handle, bio, specialties, display_name, home_system, combat_role } = req.body;
  const userId = req.user!.userId;

  const updates: string[] = [];
  const params: any[] = [];

  if (rsi_handle !== undefined) {
    const cleanRsiHandle =
      typeof rsi_handle === 'string' && rsi_handle.trim() ? rsi_handle.trim() : null;
    if (cleanRsiHandle) {
      const conflict = db
        .prepare(
          `SELECT id FROM users
           WHERE id != ?
             AND (LOWER(TRIM(COALESCE(rsi_handle, ''))) = LOWER(?) OR LOWER(TRIM(display_name)) = LOWER(?) OR LOWER(id) = LOWER(?))
           LIMIT 1`
        )
        .get(userId, cleanRsiHandle, cleanRsiHandle, cleanRsiHandle);
      if (conflict) {
        return res.status(409).json({
          error: 'Ese Handle RSI ya pertenece a otro Hermano de la Orden.',
        });
      }
    }
    updates.push('rsi_handle = ?');
    params.push(cleanRsiHandle);
  }
  if (bio !== undefined) {
    updates.push('bio = ?');
    params.push(typeof bio === 'string' ? bio : null);
  }
  if (display_name !== undefined) {
    const cleanName = typeof display_name === 'string' ? display_name.trim() : '';
    if (!cleanName) {
      return res.status(400).json({ error: 'El nombre de combate (display_name) no puede estar vacío.' });
    }
    const nameConflict = db
      .prepare(
        `SELECT id FROM users
         WHERE id != ?
           AND (LOWER(TRIM(display_name)) = LOWER(?) OR LOWER(TRIM(COALESCE(rsi_handle, ''))) = LOWER(?) OR LOWER(id) = LOWER(?))
         LIMIT 1`
      )
      .get(userId, cleanName, cleanName, cleanName);
    if (nameConflict) {
      return res.status(409).json({
        error: 'Ese nombre de Hermano ya está en uso en los registros.',
      });
    }
    updates.push('display_name = ?');
    params.push(cleanName);
  }
  if (specialties !== undefined) {
    if (!Array.isArray(specialties)) {
      return res.status(400).json({ error: 'specialties debe ser un arreglo de cadenas.' });
    }
    updates.push('specialties = ?');
    params.push(JSON.stringify(specialties.map((s) => String(s))));
  }
  if (home_system !== undefined) {
    const cleanSys = typeof home_system === 'string' ? home_system.trim() : '';
    if (!cleanSys) {
      return res.status(400).json({ error: 'El sistema de operaciones (home_system) no puede estar vacío.' });
    }
    updates.push('home_system = ?');
    params.push(cleanSys.slice(0, 64));
  }
  if (combat_role !== undefined) {
    const cleanCombat = typeof combat_role === 'string' ? combat_role.trim() : '';
    if (!cleanCombat) {
      return res.status(400).json({ error: 'El rol de combate (combat_role) no puede estar vacío.' });
    }
    updates.push('combat_role = ?');
    params.push(cleanCombat.slice(0, 80));
  }

  if (updates.length === 0) {
    const current = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    return res.json({
      success: true,
      message: 'Sin cambios',
      user: current ? buildSelfProfile(current) : undefined,
    });
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(userId);

  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
  res.json({
    success: true,
    message: 'Expediente del Hermano sellado en el Códice.',
    user: updated ? buildSelfProfile(updated) : undefined,
  });
});

authRouter.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('ancalagon_token');
  res.json({ success: true, message: 'Has cerrado las puertas del Umbral.' });
});
