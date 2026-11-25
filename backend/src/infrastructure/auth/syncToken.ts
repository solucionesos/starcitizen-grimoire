import { Request } from 'express';

export function getAgentSyncToken(): string {
  return process.env.AGENT_SYNC_TOKEN || process.env.SYNC_SECRET_TOKEN || 'ancalagon-sync-secret';
}

export function extractAgentToken(req: Request): string {
  const raw = req.headers['x-sync-token'] || req.headers['x-agent-token'] || req.body?.agent_token;
  if (Array.isArray(raw)) {
    return String(raw[0] || '').trim();
  }
  return typeof raw === 'string' ? raw.trim() : '';
}

export function verifySyncToken(req: Request): boolean {
  const provided = extractAgentToken(req);
  const expected = getAgentSyncToken();
  return provided.length > 0 && provided === expected;
}
