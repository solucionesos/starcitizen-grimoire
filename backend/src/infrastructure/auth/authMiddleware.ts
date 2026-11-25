import { Request, Response, NextFunction } from 'express';
import { verifyToken, UserSessionPayload } from './authService.js';
import { getAgentSyncToken, extractAgentToken, verifySyncToken } from './syncToken.js';
import { db } from '../database/sqlite.js';

export { getAgentSyncToken, extractAgentToken, verifySyncToken };

export type UserRole = 'visitante' | 'neofito' | 'hermano' | 'oficial' | 'consejo' | 'admin';

export interface AuthenticatedRequest extends Request {
  user?: UserSessionPayload & { fullUser?: any };
}

export class HttpError extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
  }
}

export class ForbiddenError extends HttpError {
  constructor(message: string) {
    super(403, message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends HttpError {
  constructor(message: string) {
    super(404, message);
    this.name = 'NotFoundError';
  }
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
  req.user = undefined;
  const token = extractToken(req);
  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.userId) as any;
      if (user && user.discord_id === payload.discordId) {
        req.user = {
          ...payload,
          discordId: user.discord_id,
          role: user.role,
          status: user.status,
          rankLevel: user.rank_level,
          fullUser: user,
        };
      }
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

  // Refresh user current role, status, and discord binding from DB
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.userId) as any;
  if (!user || user.discord_id !== payload.discordId) {
    return res.status(401).json({ error: 'El sello de autenticación ya no es válido o fue revocado.' });
  }

  req.user = {
    ...payload,
    discordId: user.discord_id,
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

export function requireOfficerOrAbove(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  requireApproved(req, res, () => {
    if (!req.user || !['oficial', 'consejo', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        error: 'Acceso restringido. Solo las Voces del Abismo, Profetas del Concilio o el Heraldo pueden ejecutar esta orden.',
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

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  requireApproved(req, res, () => {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Acceso restringido. Solo el Heraldo (admin) posee autoridad suprema para este decreto.',
      });
    }
    next();
  });
}

const PRIVILEGED_COUNCIL_ROLES = ['admin', 'consejo'];

export interface AuthorityCheckInput {
  actorId: string;
  actorRole: string;
  targetUser?: { id?: string; role: string; rank_level: number };
  requestedRole?: string | null;
  requestedRankLevel?: number | null;
  requestedStatus?: string | null;
}

export function assertCouncilAuthority(input: AuthorityCheckInput): void {
  const { actorId, actorRole, targetUser, requestedRole, requestedRankLevel, requestedStatus } = input;

  if (!PRIVILEGED_COUNCIL_ROLES.includes(actorRole)) {
    throw new ForbiddenError('Autoridad insuficiente. Se requiere rango de Concilio o Heraldo.');
  }

  if (actorRole === 'admin') {
    if (targetUser && targetUser.id === actorId) {
      if (requestedRole && requestedRole !== 'admin') {
        throw new ForbiddenError('No puedes degradar tu propio rol de Administrador Supremo.');
      }
      if (requestedStatus && requestedStatus !== 'approved') {
        throw new ForbiddenError('No puedes suspender o rechazar tu propia cuenta.');
      }
    }
    if (targetUser && targetUser.id === 'usr-quaker-heraldo') {
      if (requestedRole && requestedRole !== 'admin') {
        throw new ForbiddenError(
          'El expediente fundacional del Heraldo (Quaker) no puede perder el rol de Administrador Supremo.'
        );
      }
      if (requestedStatus && requestedStatus !== 'approved') {
        throw new ForbiddenError(
          'El expediente fundacional del Heraldo (Quaker) no puede ser suspendido o rechazado.'
        );
      }
    }
    return;
  }

  // actorRole === 'consejo'
  if (targetUser) {
    const targetIsProtected =
      targetUser.id === 'usr-quaker-heraldo' ||
      PRIVILEGED_COUNCIL_ROLES.includes(targetUser.role) ||
      Number(targetUser.rank_level) >= 5;

    if (targetIsProtected) {
      throw new ForbiddenError(
        'Un Profeta del Consejo no puede alterar expedientes de otros Profetas o del Heraldo.'
      );
    }
  }

  if (requestedRole && PRIVILEGED_COUNCIL_ROLES.includes(requestedRole)) {
    throw new ForbiddenError('Solo el Heraldo (admin) puede otorgar permisos de Consejo o Administrador.');
  }

  if (typeof requestedRankLevel === 'number' && requestedRankLevel >= 5) {
    throw new ForbiddenError('Solo el Heraldo (admin) puede ascender a Profeta de la Ruina o Heraldo.');
  }
}

export function assertCanManageTarget(
  actorRole: string,
  target: { id?: string; role: string; rank_level: number },
  requestedRole?: string,
  requestedRankLevel?: number,
  actorId = '',
  requestedStatus?: string | null
): string | null {
  try {
    assertCouncilAuthority({
      actorId,
      actorRole,
      targetUser: target,
      requestedRole: requestedRole ?? null,
      requestedRankLevel: requestedRankLevel ?? null,
      requestedStatus: requestedStatus ?? null,
    });
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : 'Autoridad insuficiente.';
  }
}
