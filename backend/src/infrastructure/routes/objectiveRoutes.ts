import { Router, Response } from 'express';
import { requireApproved, AuthenticatedRequest } from '../auth/authMiddleware.js';
import { db } from '../database/sqlite.js';
import crypto from 'node:crypto';

export const objectiveRouter = Router();

// Listar Designios (disponible para todos los hermanos consagrados)
objectiveRouter.get('/', requireApproved, (req: AuthenticatedRequest, res: Response) => {
  const { scope, status, category, assigned_to } = req.query;

  let query = `
    SELECT o.*, u.display_name as creator_name, a.display_name as assignee_name, a.cargo as assignee_cargo
    FROM objectives o
    LEFT JOIN users u ON o.creator_id = u.id
    LEFT JOIN users a ON o.assigned_to = a.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (scope) {
    query += ' AND o.scope = ?';
    params.push(scope);
  }
  if (status) {
    query += ' AND o.status = ?';
    params.push(status);
  }
  if (category) {
    query += ' AND o.category = ?';
    params.push(category);
  }
  if (assigned_to) {
    query += ' AND o.assigned_to = ?';
    params.push(assigned_to);
  }

  query += ' ORDER BY o.created_at DESC';

  const rows = db.prepare(query).all(...params);
  res.json(rows);
});

// Endpoint directo en caliente para que el Oráculo / Agente IA proclame Designios por orden del usuario
const handleAgentCreateObjective = (req: AuthenticatedRequest, res: Response) => {
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
    scope = 'org',
    category = 'general',
    status = 'activo',
    progress = 0,
    due_date,
    creator_handle = 'Enanimus',
    assigned_to,
    assigned_to_handle,
    linked_mandate_id,
    linked_recipe_id,
  } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'El título del Designio Sagrado (title) es obligatorio.' });
  }

  const creatorUser =
    (db
      .prepare('SELECT id, display_name, rank_id, cargo FROM users WHERE LOWER(display_name) = LOWER(?) OR id = ?')
      .get(creator_handle, creator_handle) as any) ||
    (db.prepare("SELECT id, display_name, rank_id, cargo FROM users WHERE id = 'usr-enanimus-profeta'").get() as any) ||
    (db.prepare('SELECT id, display_name, rank_id, cargo FROM users ORDER BY rank_level DESC LIMIT 1').get() as any);

  let resolvedAssigneeId: string | null = null;
  const targetAssigneeLookup = assigned_to_handle || assigned_to;
  if (targetAssigneeLookup) {
    const assigneeUser = db
      .prepare('SELECT id FROM users WHERE LOWER(display_name) = LOWER(?) OR id = ?')
      .get(targetAssigneeLookup, targetAssigneeLookup) as any;
    if (assigneeUser) {
      resolvedAssigneeId = assigneeUser.id;
    }
  }

  const ritualDescription =
    description ||
    `Por decreto de ${creatorUser.display_name} (${creatorUser.cargo}), se ordena ejecutar el designio "${title}". El incumplimiento es una ofensa contra el Abismo. La recompensa: la Marca del Abismo. El costo del fracaso: el silencio. IN NOMINI OBLIVIONIS.`;

  const id = crypto.randomUUID();
  const clampedProgress = Math.max(0, Math.min(100, Number(progress) || 0));

  db.prepare(`
    INSERT INTO objectives (
      id, title, description, scope, status, progress, creator_id,
      assigned_to, category, due_date, linked_mandate_id, linked_recipe_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    title,
    ritualDescription,
    scope,
    status,
    clampedProgress,
    creatorUser.id,
    resolvedAssigneeId,
    category,
    due_date || null,
    linked_mandate_id || null,
    linked_recipe_id || null
  );

  const created = db
    .prepare(
      `SELECT o.*, u.display_name as creator_name, a.display_name as assignee_name, a.cargo as assignee_cargo
       FROM objectives o
       LEFT JOIN users u ON o.creator_id = u.id
       LEFT JOIN users a ON o.assigned_to = a.id
       WHERE o.id = ?`
    )
    .get(id);

  res.status(201).json({
    success: true,
    message: `Designio "${title}" proclamado e inscrito en caliente en los Edictos Sagrados. IN NOMINI OBLIVIONIS.`,
    objective: created,
  });
};

objectiveRouter.post('/agent', handleAgentCreateObjective);
objectiveRouter.post('/proclaim', handleAgentCreateObjective);

// Proclamar nuevo Designio
objectiveRouter.post('/', requireApproved, (req: AuthenticatedRequest, res: Response) => {
  const {
    title,
    description,
    scope = 'org',
    category = 'general',
    due_date,
    assigned_to,
    linked_mandate_id,
    linked_recipe_id,
  } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'El título del Designio Sagrado es obligatorio.' });
  }

  const id = crypto.randomUUID();
  const creatorId = req.user?.userId;

  db.prepare(`
    INSERT INTO objectives (
      id, title, description, scope, status, progress, creator_id,
      assigned_to, category, due_date, linked_mandate_id, linked_recipe_id
    ) VALUES (?, ?, ?, ?, 'activo', 0, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    title,
    description || null,
    scope,
    creatorId,
    assigned_to || null,
    category,
    due_date || null,
    linked_mandate_id || null,
    linked_recipe_id || null
  );

  const created = db.prepare(`
    SELECT o.*, u.display_name as creator_name, a.display_name as assignee_name
    FROM objectives o
    LEFT JOIN users u ON o.creator_id = u.id
    LEFT JOIN users a ON o.assigned_to = a.id
    WHERE o.id = ?
  `).get(id);
  res.status(201).json(created);
});

// Actualizar progreso, estado o asignación de un Designio
objectiveRouter.patch('/:id', requireApproved, (req: AuthenticatedRequest, res: Response) => {
  const id = req.params.id;
  const { progress, status, description, due_date, assigned_to } = req.body;

  const existing = db.prepare('SELECT * FROM objectives WHERE id = ?').get(id) as any;
  if (!existing) return res.status(404).json({ error: 'Designio no hallado en el Códice.' });

  const updates: string[] = [];
  const params: any[] = [];

  if (progress !== undefined) {
    const p = Math.max(0, Math.min(100, Number(progress)));
    updates.push('progress = ?');
    params.push(p);
    if (p === 100 && existing.status !== 'marca_del_abismo' && existing.status !== 'cumplido') {
      updates.push("status = 'marca_del_abismo'");
    } else if (p > 0 && p < 100 && existing.status === 'activo') {
      updates.push("status = 'en_progreso'");
    }
  }

  if (status !== undefined) {
    updates.push('status = ?');
    params.push(status);
  }

  if (description !== undefined) {
    updates.push('description = ?');
    params.push(description);
  }

  if (due_date !== undefined) {
    updates.push('due_date = ?');
    params.push(due_date);
  }

  if (assigned_to !== undefined) {
    updates.push('assigned_to = ?');
    params.push(assigned_to || null);
  }

  if (updates.length === 0) {
    return res.json({ message: 'Sin modificaciones' });
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(id);

  db.prepare(`UPDATE objectives SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const updated = db.prepare(`
    SELECT o.*, u.display_name as creator_name, a.display_name as assignee_name
    FROM objectives o
    LEFT JOIN users u ON o.creator_id = u.id
    LEFT JOIN users a ON o.assigned_to = a.id
    WHERE o.id = ?
  `).get(id);
  res.json(updated);
});

// Otorgar la Marca del Abismo (Verificación del Concilio / Voces del Abismo)
objectiveRouter.post('/:id/verify', requireApproved, (req: AuthenticatedRequest, res: Response) => {
  const id = req.params.id;
  const verifierId = req.user?.userId;

  if (!['oficial', 'consejo', 'admin'].includes(req.user?.role || '')) {
    return res.status(403).json({
      error: 'Solo las Voces del Abismo, los Profetas de la Ruina o el Heraldo pueden otorgar la Marca del Abismo.',
    });
  }

  db.prepare(`
    UPDATE objectives 
    SET status = 'marca_del_abismo',
        progress = 100,
        verified_by = ?,
        verified_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(verifierId, id);

  res.json({
    success: true,
    message: 'Marca del Abismo otorgada y sellada por el Concilio del Vacío. IN NOMINI OBLIVIONIS.',
  });
});

// Disolver Designio
objectiveRouter.delete('/:id', requireApproved, (req: AuthenticatedRequest, res: Response) => {
  const id = req.params.id;
  const existing = db.prepare('SELECT * FROM objectives WHERE id = ?').get(id) as any;
  if (!existing) return res.status(404).json({ error: 'Designio no hallado' });

  if (existing.creator_id !== req.user?.userId && !['consejo', 'admin'].includes(req.user?.role || '')) {
    return res.status(403).json({ error: 'No posees la autoridad del Concilio del Vacío para disolver este Designio.' });
  }

  db.prepare('DELETE FROM objectives WHERE id = ?').run(id);
  res.json({ success: true, message: 'Designio arrojado a La Ceniza Fría.' });
});
