import { Router, Response } from 'express';
import { requireCouncil, AuthenticatedRequest } from '../auth/authMiddleware.js';
import { ESCALA_DEL_ABISMO, resolveUserRank } from '../auth/authService.js';
import { db } from '../database/sqlite.js';

export const councilRouter = Router();

// Listar miembros de la flota (con filtro opcional por status)
councilRouter.get('/users', requireCouncil, (req: AuthenticatedRequest, res: Response) => {
  const status = req.query.status as string;
  let query = 'SELECT * FROM users ORDER BY rank_level DESC, created_at DESC';
  let params: any[] = [];

  if (status) {
    query = 'SELECT * FROM users WHERE status = ? ORDER BY rank_level DESC, created_at DESC';
    params = [status];
  }

  const users = db.prepare(query).all(...params) as any[];
  const enriched = users.map((u) => ({
    ...u,
    rank: resolveUserRank(u.rank_id, u.status),
    specialties: u.specialties ? JSON.parse(u.specialties) : [],
  }));

  res.json(enriched);
});

// Aprobar Candidato en el Ritual de Iniciación -> asciende a Sombras del Umbral (nivel 1)
councilRouter.post('/users/:id/approve', requireCouncil, (req: AuthenticatedRequest, res: Response) => {
  const targetId = req.params.id;
  const councilId = req.user?.userId;

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId) as any;
  if (!user) return res.status(404).json({ error: 'Candidato no hallado en el Umbral' });

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

  res.json({
    success: true,
    message: `${user.display_name} ha superado el juicio del Concilio del Vacío y ahora camina entre las Sombras del Umbral. IN NOMINI OBLIVIONIS.`,
  });
});

// Rechazar candidato -> La Ceniza Fría
councilRouter.post('/users/:id/reject', requireCouncil, (req: AuthenticatedRequest, res: Response) => {
  const targetId = req.params.id;
  db.prepare(`
    UPDATE users 
    SET status = 'rejected',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(targetId);

  res.json({ success: true, message: 'El candidato ha sido arrojado a La Ceniza Fría.' });
});

// Ascender en La Escala del Abismo o asignar Cargo y Sendas (soportando /promote y /role)
const handlePromoteOrRole = (req: AuthenticatedRequest, res: Response) => {
  const targetId = req.params.id;
  const { rank_id, cargo, role, specialties } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId) as any;
  if (!user) return res.status(404).json({ error: 'Hermano no encontrado en el registro sagrado' });

  const targetRank = ESCALA_DEL_ABISMO.find((r) => r.id === rank_id);
  const rankLevel = targetRank ? targetRank.level : user.rank_level;

  // Derivar rol de permisos según el escalafón si no se especificó explícitamente
  let derivedRole = role;
  if (!derivedRole && targetRank) {
    if (targetRank.level >= 5) derivedRole = 'consejo';
    else if (targetRank.level === 4) derivedRole = 'oficial';
    else derivedRole = 'hermano';
  }

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
  `).run(rank_id || null, rankLevel, cargo || null, derivedRole || null, specialtiesJson, targetId);

  res.json({
    success: true,
    message: `Por decreto del Concilio del Vacío, el rango y cargo de ${user.display_name} han sido grabados en piedra. IN NOMINI OBLIVIONIS.`,
  });
};

councilRouter.patch('/users/:id/promote', requireCouncil, handlePromoteOrRole);
councilRouter.patch('/users/:id/role', requireCouncil, handlePromoteOrRole);
