import { Router, Request, Response } from 'express';
import {
  getDiscordAuthUrl,
  handleDiscordCallback,
  devQuickLogin,
  bindUserToRosterProfile,
  ESCALA_DEL_ABISMO,
  resolveUserRank,
} from '../auth/authService.js';
import { requireAuth, requireApproved, AuthenticatedRequest } from '../auth/authMiddleware.js';
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
  const expectedSecret = process.env.AGENT_SYNC_TOKEN || 'ancalagon-sync-secret';

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
    const msg = err instanceof Error ? err.message : 'Error vinculando expediente.';
    res.status(400).json({ error: msg });
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
      `SELECT id, display_name, rsi_handle, discord_avatar, role, rank_id, rank_level, cargo, specialties
       FROM users
       WHERE status = 'approved'
       ORDER BY rank_level DESC, display_name ASC`
    )
    .all() as any[];

  const enriched = brothers.map((u) => ({
    ...u,
    rank: resolveUserRank(u.rank_id, 'approved'),
    specialties: u.specialties ? JSON.parse(u.specialties) : [],
  }));

  res.json(enriched);
});

// Perfil actual del Hermano
authRouter.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user?.fullUser;
  if (!user) return res.status(404).json({ error: 'Hermano no encontrado en los registros.' });

  const currentRank = resolveUserRank(user.rank_id, user.status);

  res.json({
    id: user.id,
    discord_id: user.discord_id,
    discord_username: user.discord_username,
    discord_avatar: user.discord_avatar,
    display_name: user.display_name,
    rsi_handle: user.rsi_handle,
    status: user.status,
    role: user.role,
    rank: currentRank,
    cargo: user.cargo,
    specialties: user.specialties ? JSON.parse(user.specialties) : [],
    bio: user.bio,
    created_at: user.created_at,
  });
});

// Actualizar expediente propio
authRouter.patch('/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { rsi_handle, bio, specialties, display_name } = req.body;
  const userId = req.user?.userId;

  const updates: string[] = [];
  const params: any[] = [];

  if (rsi_handle !== undefined) {
    updates.push('rsi_handle = ?');
    params.push(rsi_handle);
  }
  if (bio !== undefined) {
    updates.push('bio = ?');
    params.push(bio);
  }
  if (display_name !== undefined) {
    updates.push('display_name = ?');
    params.push(display_name);
  }
  if (specialties !== undefined) {
    updates.push('specialties = ?');
    params.push(JSON.stringify(specialties));
  }

  if (updates.length === 0) {
    return res.json({ message: 'Sin cambios' });
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(userId);

  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ success: true, message: 'Expediente del Hermano sellado en el Códice.' });
});

authRouter.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('ancalagon_token');
  res.json({ success: true, message: 'Has cerrado las puertas del Umbral.' });
});
