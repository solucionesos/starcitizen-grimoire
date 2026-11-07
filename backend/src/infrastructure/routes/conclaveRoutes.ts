import { Router, Response } from 'express';
import { requireApproved, optionalAuth, AuthenticatedRequest } from '../auth/authMiddleware.js';
import { db } from '../database/sqlite.js';
import crypto from 'node:crypto';

export const conclaveRouter = Router();

// Cierra una deliberación, genera el Veredicto y ejecuta su efecto vinculante en Edictos
function finalizePoll(poll: any) {
  const optionsWithVotes = db
    .prepare(
      `SELECT po.*, COUNT(v.id) as votes_count
       FROM poll_options po
       LEFT JOIN votes v ON po.id = v.option_id
       WHERE po.poll_id = ?
       GROUP BY po.id
       ORDER BY votes_count DESC`
    )
    .all(poll.id) as any[];

  if (optionsWithVotes.length === 0) return null;

  const winner = optionsWithVotes[0];
  const totalVotes = optionsWithVotes.reduce((acc, curr) => acc + curr.votes_count, 0);

  db.prepare(
    `UPDATE polls 
     SET status = 'closed',
         winner_option_id = ?
     WHERE id = ?`
  ).run(winner.id, poll.id);

  let parsedMeta: Record<string, any> = {};
  if (winner.metadata) {
    try {
      parsedMeta = JSON.parse(winner.metadata);
    } catch {
      parsedMeta = {};
    }
  }

  const verdictId = crypto.randomUUID();
  let actionTaken = `Por decreto del Concilio del Vacío, la voluntad de la Hermandad ha sellado: "${winner.label}". IN NOMINI OBLIVIONIS.`;
  const summary = `Con un quórum de ${totalVotes} hermanos consagrados, el Concilio del Vacío ha dictado sentencia inapelable.`;

  // Efecto vinculante automático en Edictos (Designios, Cruzadas o Calendario)
  if (poll.poll_type === 'cruzada') {
    const crusadeId = `crusade-poll-${poll.id.slice(0, 8)}`;
    const exists = db.prepare('SELECT id FROM crusades WHERE id = ?').get(crusadeId);
    if (!exists) {
      const opDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
      const location = parsedMeta.location || 'Sector Designado por el Concilio del Vacío';
      db.prepare(
        `INSERT INTO crusades (
          id, title, description, briefing, operation_date, location,
          status, creator_id, ships_required, max_brothers
        ) VALUES (?, ?, ?, ?, ?, ?, 'convocada', ?, ?, 24)`
      ).run(
        crusadeId,
        `Edicto Sagrado: ${winner.label}`,
        winner.description || poll.description || 'Operación consagrada por el Veredicto del Concilio del Vacío.',
        `Por decreto de los Profetas de la Ruina, se ordena ejecutar "${winner.label}" en ${location}. El incumplimiento es una ofensa contra el Abismo. La recompensa: la Marca del Abismo. El costo del fracaso: el silencio. IN NOMINI OBLIVIONIS.`,
        opDate,
        location,
        poll.creator_id,
        JSON.stringify(['Polaris', 'Redeemer', 'Eclipse'])
      );
    }
    actionTaken = `Edicto Sagrado proclamado e inscrito automáticamente en Cruzadas y en el Calendario Abisal: "${winner.label}". IN NOMINI OBLIVIONIS.`;
  } else if (poll.poll_type === 'convocatoria') {
    const crusadeId = `conv-poll-${poll.id.slice(0, 8)}`;
    const exists = db.prepare('SELECT id FROM crusades WHERE id = ?').get(crusadeId);
    if (!exists) {
      const opDate = parsedMeta.date || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      db.prepare(
        `INSERT INTO crusades (
          id, title, description, briefing, operation_date, location,
          status, creator_id, ships_required, max_brothers
        ) VALUES (?, ?, ?, ?, ?, ?, 'convocada', ?, ?, 24)`
      ).run(
        crusadeId,
        `Convocatoria del Concilio: ${poll.title}`,
        `Fecha consagrada por el Concilio del Vacío: ${winner.label}.`,
        `Por decreto del Concilio del Vacío, se convoca a toda la flota en el ciclo elegido (${winner.label}). El costo de la ausencia injustificada: La Ceniza Fría. IN NOMINI OBLIVIONIS.`,
        opDate,
        'Punto de Reunión Abisal',
        poll.creator_id,
        JSON.stringify(['Flota Completa'])
      );
    }
    actionTaken = `Fecha sagrada sellada (${winner.label}) e inscrita automáticamente en el Calendario Abisal. IN NOMINI OBLIVIONIS.`;
  } else if (poll.poll_type === 'designio') {
    const objId = `obj-poll-${poll.id.slice(0, 8)}`;
    const exists = db.prepare('SELECT id FROM objectives WHERE id = ?').get(objId);
    if (!exists) {
      db.prepare(
        `INSERT INTO objectives (
          id, title, description, scope, status, progress, creator_id, category
        ) VALUES (?, ?, ?, 'org', 'activo', 0, ?, 'general')`
      ).run(
        objId,
        winner.label,
        winner.description || `Designio de la Flota consagrado por Veredicto del Concilio del Vacío (${poll.title}). IN NOMINI OBLIVIONIS.`,
        poll.creator_id
      );
    }
    actionTaken = `Designio de la Flota activado e inscrito automáticamente en Edictos Sagrados: "${winner.label}". IN NOMINI OBLIVIONIS.`;
  }

  db.prepare(
    `INSERT INTO verdicts (id, poll_id, title, poll_type, winner_label, total_votes, summary, action_taken)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(poll_id) DO UPDATE SET
       winner_label = excluded.winner_label,
       total_votes = excluded.total_votes,
       summary = excluded.summary,
       action_taken = excluded.action_taken,
       closed_at = CURRENT_TIMESTAMP`
  ).run(verdictId, poll.id, poll.title, poll.poll_type, winner.label, totalVotes, summary, actionTaken);

  return {
    title: poll.title,
    winner: winner.label,
    votes: winner.votes_count,
    totalVotes,
    actionTaken,
  };
}

// Revisa y sella automáticamente las deliberaciones cuyo tiempo haya expirado
function autoCloseExpiredPolls() {
  const expiredPolls = db
    .prepare(
      `SELECT * FROM polls 
       WHERE status = 'open' AND datetime(closes_at) <= datetime('now')`
    )
    .all() as any[];

  for (const p of expiredPolls) {
    finalizePoll(p);
  }
}

const handleHomeVerdicts = (req: AuthenticatedRequest, res: Response) => {
  autoCloseExpiredPolls();
  const isApproved = req.user && req.user.status === 'approved';

  const verdicts = db
    .prepare(
      `SELECT * FROM verdicts 
       WHERE featured_in_home = 1 
       ORDER BY closed_at DESC 
       LIMIT 4`
    )
    .all() as any[];

  const sanitized = verdicts.map((v) => {
    if (!isApproved) {
      return {
        id: v.id,
        title: v.title,
        poll_type: v.poll_type,
        winner_label: v.winner_label,
        summary:
          'El Concilio del Vacío de Ancalagon Oblivion Fleet ha deliberado y sellado su decreto en piedra. IN NOMINI OBLIVIONIS.',
        closed_at: v.closed_at,
        is_public: true,
      };
    }
    return v;
  });

  res.json(sanitized);
};

// GET /home y /verdicts/home
conclaveRouter.get('/home', optionalAuth, handleHomeVerdicts);
conclaveRouter.get('/verdicts/home', optionalAuth, handleHomeVerdicts);

// GET /api/polls (Exclusivo para Hermanos Consagrados)
conclaveRouter.get('/', requireApproved, (req: AuthenticatedRequest, res: Response) => {
  autoCloseExpiredPolls();
  const userId = req.user?.userId;

  const polls = db
    .prepare(
      `SELECT p.*, u.display_name as creator_name,
              (SELECT COUNT(*) FROM votes v WHERE v.poll_id = p.id) as total_votes,
              (SELECT option_id FROM votes v WHERE v.poll_id = p.id AND v.user_id = ?) as user_voted_option_id
       FROM polls p
       LEFT JOIN users u ON p.creator_id = u.id
       ORDER BY p.status DESC, p.created_at DESC`
    )
    .all(userId) as any[];

  const enriched = polls.map((p) => {
    const options = db
      .prepare(
        `SELECT po.*,
                (SELECT COUNT(*) FROM votes v WHERE v.option_id = po.id) as votes_count
         FROM poll_options po
         WHERE po.poll_id = ?`
      )
      .all(p.id);

    return {
      ...p,
      options,
    };
  });

  res.json(enriched);
});

// POST /api/polls/agent (Endpoint directo para que el Oráculo / Agente IA proclame votaciones por orden del usuario)
const handleAgentCreatePoll = (req: AuthenticatedRequest, res: Response) => {
  const expectedToken = process.env.SYNC_SECRET_TOKEN || 'ancalagon-sync-secret';
  const providedToken = req.headers['x-sync-token'] || req.headers['x-agent-token'] || req.body?.agent_token;

  if (providedToken !== expectedToken) {
    return res.status(401).json({
      error: 'Sello del Oráculo inválido. Proporciona el encabezado X-Agent-Token o X-Sync-Token.',
    });
  }

  const {
    title,
    description = '',
    poll_type = 'cruzada',
    closes_at,
    min_rank_level = 1,
    creator_handle = 'Enanimus',
    options = [],
  } = req.body;

  if (!title || !Array.isArray(options) || options.length < 2) {
    return res.status(400).json({
      error: 'Se requiere title y un arreglo options con al menos 2 sendas a deliberar.',
    });
  }

  const creatorUser =
    (db
      .prepare('SELECT id, display_name FROM users WHERE LOWER(display_name) = LOWER(?) OR id = ?')
      .get(creator_handle, creator_handle) as any) ||
    (db.prepare("SELECT id, display_name FROM users WHERE id = 'usr-enanimus-profeta'").get() as any) ||
    (db.prepare('SELECT id, display_name FROM users ORDER BY rank_level DESC LIMIT 1').get() as any);

  const pollId = crypto.randomUUID();
  const effectiveClosesAt =
    closes_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  db.prepare(
    `INSERT INTO polls (id, title, description, poll_type, status, closes_at, creator_id, min_rank_level)
     VALUES (?, ?, ?, ?, 'open', ?, ?, ?)`
  ).run(
    pollId,
    title,
    description,
    poll_type,
    effectiveClosesAt,
    creatorUser.id,
    Number(min_rank_level) || 1
  );

  const insertOption = db.prepare(
    `INSERT INTO poll_options (id, poll_id, label, description, metadata)
     VALUES (?, ?, ?, ?, ?)`
  );

  const createdOptions: any[] = [];
  for (const opt of options) {
    const optId = crypto.randomUUID();
    const label = typeof opt === 'string' ? opt : opt.label;
    const desc = typeof opt === 'object' && opt.description ? opt.description : null;
    const meta = typeof opt === 'object' && opt.metadata ? JSON.stringify(opt.metadata) : null;
    insertOption.run(optId, pollId, label, desc, meta);
    createdOptions.push({ id: optId, poll_id: pollId, label, description: desc, votes_count: 0 });
  }

  res.status(201).json({
    success: true,
    id: pollId,
    title,
    poll_type,
    closes_at: effectiveClosesAt,
    creator_name: creatorUser.display_name,
    min_rank_level,
    options: createdOptions,
    message: `Por decreto de ${creatorUser.display_name}, la deliberación "${title}" ha sido abierta en el Cónclave del Concilio del Vacío. IN NOMINI OBLIVIONIS.`,
  });
};

conclaveRouter.post('/agent', handleAgentCreatePoll);
conclaveRouter.post('/proclaim', handleAgentCreatePoll);

// GET /api/polls/:id
conclaveRouter.get('/:id', requireApproved, (req: AuthenticatedRequest, res: Response) => {
  const pollId = req.params.id;
  const userId = req.user?.userId;

  const poll = db
    .prepare(
      `SELECT p.*, u.display_name as creator_name,
              (SELECT COUNT(*) FROM votes v WHERE v.poll_id = p.id) as total_votes,
              (SELECT option_id FROM votes v WHERE v.poll_id = p.id AND v.user_id = ?) as user_voted_option_id
       FROM polls p
       LEFT JOIN users u ON p.creator_id = u.id
       WHERE p.id = ?`
    )
    .get(userId, pollId) as any;

  if (!poll) return res.status(404).json({ error: 'Deliberación no hallada en el Concilio del Vacío.' });

  const options = db
    .prepare(
      `SELECT po.*,
              (SELECT COUNT(*) FROM votes v WHERE v.option_id = po.id) as votes_count
       FROM poll_options po
       WHERE po.poll_id = ?`
    )
    .all(pollId);

  res.json({ ...poll, options });
});

// POST /api/polls (Convocar deliberación en el Concilio del Vacío)
conclaveRouter.post('/', requireApproved, (req: AuthenticatedRequest, res: Response) => {
  if (!['oficial', 'consejo', 'admin'].includes(req.user?.role || '')) {
    return res.status(403).json({
      error: 'Solo las Voces del Abismo, los Profetas de la Ruina y el Heraldo pueden convocar al Concilio del Vacío.',
    });
  }

  const { title, description, poll_type, closes_at, min_rank_level = 1, options = [] } = req.body;

  if (!title || !poll_type || !closes_at || !Array.isArray(options) || options.length < 2) {
    return res.status(400).json({ error: 'Debes proporcionar título, tipo, fecha de cierre y al menos 2 opciones.' });
  }

  const pollId = crypto.randomUUID();
  const creatorId = req.user?.userId;

  db.prepare(
    `INSERT INTO polls (id, title, description, poll_type, status, closes_at, creator_id, min_rank_level)
     VALUES (?, ?, ?, ?, 'open', ?, ?, ?)`
  ).run(pollId, title, description || '', poll_type, closes_at, creatorId, min_rank_level);

  const insertOption = db.prepare(
    `INSERT INTO poll_options (id, poll_id, label, description, metadata)
     VALUES (?, ?, ?, ?, ?)`
  );

  for (const opt of options) {
    const optId = crypto.randomUUID();
    const label = typeof opt === 'string' ? opt : opt.label;
    const desc = typeof opt === 'object' ? opt.description : null;
    const meta = typeof opt === 'object' && opt.metadata ? JSON.stringify(opt.metadata) : null;
    insertOption.run(optId, pollId, label, desc, meta);
  }

  res.status(201).json({
    id: pollId,
    message: 'La deliberación ha sido abierta ante el Concilio del Vacío. IN NOMINI OBLIVIONIS.',
  });
});

// POST /api/polls/:id/vote
conclaveRouter.post('/:id/vote', requireApproved, (req: AuthenticatedRequest, res: Response) => {
  const pollId = req.params.id;
  const userId = req.user?.userId;
  const userRankLevel = req.user?.rankLevel ?? 0;
  const { option_id } = req.body;

  if (!option_id) {
    return res.status(400).json({ error: 'Debes elegir una senda para sellar tu voto.' });
  }

  const poll = db.prepare('SELECT * FROM polls WHERE id = ?').get(pollId) as any;
  if (!poll) return res.status(404).json({ error: 'Deliberación no hallada' });

  if (poll.status !== 'open') {
    return res.status(400).json({ error: 'Esta deliberación del Concilio del Vacío ya fue sellada.' });
  }

  if (new Date(poll.closes_at) <= new Date()) {
    finalizePoll(poll);
    return res.status(400).json({ error: 'El ciclo de deliberación ha expirado y el Veredicto ha sido sellado.' });
  }

  if (userRankLevel < poll.min_rank_level) {
    return res.status(403).json({
      error: `Tu peldaño en La Escala del Abismo no alcanza el nivel requerido (${poll.min_rank_level}) para esta deliberación.`,
    });
  }

  const option = db.prepare('SELECT * FROM poll_options WHERE id = ? AND poll_id = ?').get(option_id, pollId);
  if (!option) return res.status(400).json({ error: 'Opción no válida en este Concilio.' });

  const voteId = crypto.randomUUID();
  try {
    db.prepare(
      `INSERT INTO votes (id, poll_id, user_id, option_id)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(poll_id, user_id) DO UPDATE SET
         option_id = excluded.option_id,
         created_at = CURRENT_TIMESTAMP`
    ).run(voteId, pollId, userId, option_id);

    res.json({ success: true, message: 'Tu voluntad ha sido grabada en el Concilio del Vacío. IN NOMINI OBLIVIONIS.' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al registrar el voto';
    res.status(500).json({ error: msg });
  }
});

// POST /api/polls/:id/close
conclaveRouter.post('/:id/close', requireApproved, (req: AuthenticatedRequest, res: Response) => {
  if (!['oficial', 'consejo', 'admin'].includes(req.user?.role || '')) {
    return res.status(403).json({
      error: 'Solo los Profetas de la Ruina, las Voces del Abismo o el Heraldo pueden sellar el Veredicto.',
    });
  }

  const pollId = req.params.id;
  const poll = db.prepare('SELECT * FROM polls WHERE id = ?').get(pollId) as any;
  if (!poll) return res.status(404).json({ error: 'Deliberación no hallada' });

  const result = finalizePoll(poll);
  if (!result) {
    return res.status(400).json({ error: 'La deliberación no cuenta con opciones.' });
  }

  res.json({
    success: true,
    message: 'El Concilio del Vacío ha concluido. El Veredicto ha sido inscrito en la portada y ejecutado en los Edictos. IN NOMINI OBLIVIONIS.',
    verdict: result,
  });
});
