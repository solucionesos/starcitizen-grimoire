import { Request, Response, NextFunction } from 'express';
import { verifyToken, UserSessionPayload } from './authService.js';
import { db } from '../database/sqlite.js';

export interface AuthenticatedRequest extends Request {
  user?: UserSessionPayload & { fullUser?: any };
}

export function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  if (req.cookies && req.cookies.ancalagon_token) {
    return req.cookies.ancalagon_token;
  }
  return null;
}

export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      req.user = payload;
    }
  }
  next();
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: 'No has cruzado el Umbral. Autenticación requerida.' });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'El sello de autenticación ha expirado o es inválido.' });
  }

  // Refresh user current role and status from DB
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.userId) as any;
  if (!user) {
    return res.status(401).json({ error: 'El hermano no fue hallado en los registros del Grimoire.' });
  }

  req.user = {
    ...payload,
    role: user.role,
    status: user.status,
    rankLevel: user.rank_level,
    fullUser: user,
  };

  next();
}

export function requireApproved(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (!req.user || req.user.status !== 'approved') {
      return res.status(403).json({
        error: 'Tu juramento está en deliberación. El Consejo aún no ha ratificado tu entrada a la Hermandad.',
        status: req.user?.status || 'pending',
      });
    }
    next();
  });
}

export function requireCouncil(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  requireApproved(req, res, () => {
    if (!req.user || !['consejo', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        error: 'Acceso restringido. Solo los Heraldos del Consejo pueden pronunciar este edicto.',
      });
    }
    next();
  });
}

