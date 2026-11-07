import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../auth/authMiddleware.js';
import { db } from '../database/sqlite.js';

export const altarRouter = Router();

// Retrieve user's Altar items
altarRouter.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.userId;
  const row = db.prepare('SELECT items FROM altars WHERE user_id = ?').get(userId) as any;
  if (!row) {
    return res.json({ items: [] });
  }

  try {
    const items = JSON.parse(row.items);
    res.json({ items });
  } catch {
    res.json({ items: [] });
  }
});

// Save or sync user's Altar items
altarRouter.put('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.userId;
  const { items } = req.body;

  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'Formato inválido. Se esperaba un array de items.' });
  }

  const itemsJson = JSON.stringify(items);
  db.prepare(`
    INSERT INTO altars (user_id, items, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET
      items = excluded.items,
      updated_at = CURRENT_TIMESTAMP
  `).run(userId, itemsJson);

  res.json({ success: true, message: 'Altar de Forja sincronizado con el Vacío.' });
});

