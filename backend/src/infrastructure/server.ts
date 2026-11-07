import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';

import { initDatabase } from './database/sqlite.js';
import { seedInitialData } from './database/seed.js';
import { JSONFileRepository } from './repositories/JSONFileRepository.js';
import { SCMDBAdapter } from './adapters/SCMDBAdapter.js';
import { WikiAPIAdapter } from './adapters/WikiAPIAdapter.js';
import { UexAPIAdapter } from './adapters/UexAPIAdapter.js';
import { RedditAPIAdapter } from './adapters/RedditAPIAdapter.js';
import { RSIStatusAdapter } from './adapters/RSIStatusAdapter.js';
import { SyncGameDataUseCase } from '../application/use-cases/SyncGameDataUseCase.js';
import { UpdateScheduler } from './cron/UpdateScheduler.js';

// Feature routers
import { authRouter } from './routes/authRoutes.js';
import { altarRouter } from './routes/altarRoutes.js';
import { councilRouter } from './routes/councilRoutes.js';
import { objectiveRouter } from './routes/objectiveRoutes.js';
import { crusadeRouter } from './routes/crusadeRoutes.js';
import { conclaveRouter } from './routes/conclaveRoutes.js';

// Initialize SQLite database
initDatabase();
seedInitialData();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));

// Dependencies Injection (Hexagonal)
const repository = new JSONFileRepository(path.join(process.cwd(), 'data', 'db.json'));
const fetcher = new SCMDBAdapter();
const wikiFetcher = new WikiAPIAdapter();
const uexFetcher = new UexAPIAdapter();
const redditFetcher = new RedditAPIAdapter();
const statusFetcher = new RSIStatusAdapter();
const syncUseCase = new SyncGameDataUseCase(repository, fetcher, wikiFetcher, uexFetcher);
const scheduler = new UpdateScheduler(syncUseCase);

// Start Automated Checker
scheduler.start();

// --- Feature Routes ---
app.use('/api/auth', authRouter);
app.use('/api/me/altar', altarRouter);
app.use('/api/council', councilRouter);
app.use('/api/objectives', objectiveRouter);
app.use('/api/crusades', crusadeRouter);
app.use('/api/polls', conclaveRouter);
app.use('/api/verdicts', conclaveRouter);

// --- Game Data Catalog Routes ---
app.get('/api/missions', async (req, res) => {
  const missions = await repository.getAllMissions();
  res.json(missions);
});

app.get('/api/blueprints', async (req, res) => {
  const blueprints = await repository.getAllBlueprints();
  res.json(blueprints);
});

app.get('/api/resources', async (req, res) => {
  const resources = await repository.getAllResources();
  res.json(resources);
});

app.get('/api/chronicles', async (req, res) => {
  const chronicles = await repository.getAllChronicles();
  res.json(chronicles);
});

const handleAgentCreateChronicle = async (req: express.Request, res: express.Response) => {
  const expectedToken = process.env.SYNC_SECRET_TOKEN || 'ancalagon-sync-secret';
  const providedToken = req.headers['x-sync-token'] || req.headers['x-agent-token'] || req.body?.agent_token;

  if (providedToken !== expectedToken) {
    res.status(401).json({
      error: 'Sello del Oráculo inválido. Proporciona el encabezado X-Agent-Token o X-Sync-Token.',
    });
    return;
  }

  const {
    id,
    title,
    subtitle = 'TESTIMONIO DEL VACÍO',
    date = 'Ciclo 2956',
    dateSort,
    classification = 'Crónica Sagrada',
    icon = 'dragon',
    color = 'var(--secondary)',
    blocks,
    paragraphs,
  } = req.body;

  if (!title) {
    res.status(400).json({ error: 'El título de la Crónica (title) es obligatorio.' });
    return;
  }

  let resolvedBlocks: any[] = [];
  if (Array.isArray(blocks) && blocks.length > 0) {
    resolvedBlocks = [...blocks];
  } else if (Array.isArray(paragraphs) && paragraphs.length > 0) {
    resolvedBlocks = paragraphs.map((p: string, idx: number) => ({
      type: 'p',
      text: p,
      muted: idx > 0 && idx % 2 === 1,
    }));
  } else {
    res.status(400).json({
      error: 'Debes proporcionar el arreglo blocks (o paragraphs) con el contenido litúrgico de la Crónica.',
    });
    return;
  }

  // Asegurar cierre ritual IN NOMINI OBLIVIONIS si no está presente en ningún bloque
  const hasClosing = resolvedBlocks.some(
    (b) => typeof b.text === 'string' && b.text.toUpperCase().includes('IN NOMINI OBLIVIONIS')
  );
  if (!hasClosing) {
    resolvedBlocks.push({
      type: 'quote',
      text: '☩ IN NOMINI OBLIVIONIS 🐉 ☩',
    });
  }

  // Sanitizar fecha visible para garantizar desplazamiento +930 (prohibido siglo XXI)
  const sanitizedDate = String(date).replace(/\b(202\d)\b/g, (_, y) => String(Number(y) + 930));

  try {
    const saved = await repository.saveChronicle({
      ...(id ? { id: Number(id) } : {}),
      title,
      subtitle,
      date: sanitizedDate,
      dateSort: typeof dateSort === 'number' ? dateSort : Date.now(),
      classification,
      icon,
      color,
      blocks: resolvedBlocks,
    });

    res.status(201).json({
      success: true,
      message: `La Crónica "${title} — ${subtitle}" ha sido grabada en caliente en el Lectitio Divinitatus. IN NOMINI OBLIVIONIS.`,
      chronicle: saved,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error guardando la Crónica';
    res.status(500).json({ error: msg });
  }
};

app.post('/api/chronicles/agent', handleAgentCreateChronicle);
app.post('/api/chronicles/proclaim', handleAgentCreateChronicle);

app.get('/api/ships', async (req, res) => {
  const ships = await repository.getAllShips();
  res.json(ships);
});

app.get('/api/weapons', async (req, res) => {
  const weapons = await repository.getAllVehicleWeapons();
  res.json(weapons);
});

app.get('/api/components', async (req, res) => {
  const components = await repository.getAllVehicleComponents();
  res.json(components);
});

app.get('/api/version', async (req, res) => {
  try {
    const version = await repository.getLatestVersion();
    res.json({ version });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    res.status(500).json({ error: msg });
  }
});

app.get('/api/news', async (_req, res) => {
  try {
    const response = await fetch('https://leonick.se/feeds/rsi/json', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json, */*',
      },
    });
    if (!response.ok) {
      res.status(502).json({ error: `Feed RSI respondió con status ${response.status}` });
      return;
    }

    const feed = await response.json() as {
      items: Array<{
        id: string;
        url: string;
        tags?: string[];
        summary?: string;
        content_html?: string;
        date_published?: string;
      }>
    };

    const items = (feed.items ?? []).slice(0, 20).map(item => {
      const slug = item.url?.split('/').pop() ?? '';
      const titleFromSlug = slug
        .replace(/^\d+-/, '')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());

      const cleanSummary = (item.summary ?? '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#8217;/g, "'")
        .replace(/&#8216;/g, "'")
        .replace(/&#8220;/g, '"')
        .replace(/&#8221;/g, '"')
        .replace(/<[^>]+>/g, '')
        .trim();

      return {
        id: item.id,
        title: titleFromSlug,
        summary: cleanSummary,
        url: item.url,
        tags: item.tags ?? [],
        date_published: item.date_published ?? null,
      };
    });

    res.json(items);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    res.status(502).json({ error: msg });
  }
});

app.get('/api/devtracker', async (req, res) => {
  try {
    const posts = await redditFetcher.fetchDevPosts();
    res.json(posts);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    res.status(500).json({ error: msg });
  }
});

app.get('/api/status', async (req, res) => {
  try {
    const [status, incidents] = await Promise.all([
      statusFetcher.fetchStatus(),
      statusFetcher.fetchIncidents()
    ]);
    res.json({ status, incidents });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    res.status(500).json({ error: msg });
  }
});

app.get('/api/commodities', async (req, res) => {
  try {
    const [commodities, terminals] = await Promise.all([
      uexFetcher.fetchCommoditiesPrices(),
      uexFetcher.fetchTerminals()
    ]);

    const terminalMap = new Map(terminals.map(t => [t.id, t.is_auto_load]));

    const enrichedCommodities = commodities.map(c => ({
      ...c,
      is_auto_load: terminalMap.get(c.id_terminal) ?? 0
    }));

    res.json(enrichedCommodities);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    res.status(500).json({ error: msg });
  }
});

// Secured Sync endpoint (protects against arbitrary overwrite vulnerability C1)
app.post('/api/sync/update', async (req, res) => {
  try {
    const requiredToken = process.env.SYNC_SERVICE_TOKEN;
    const providedToken = req.headers['x-sync-token'] || req.query.token;

    if (requiredToken && providedToken !== requiredToken) {
      res.status(401).json({ error: 'Acceso no autorizado al rito de sincronización.' });
      return;
    }

    const gameData = req.body;
    if (!gameData || !gameData.version) {
      res.status(400).json({ error: 'Payload inválido. Se esperaba GameData.' });
      return;
    }
    await repository.save(gameData);
    console.log(`[n8n] Datos recibidos y guardados correctamente. Version: ${gameData.version}, Naves: ${gameData.ships?.length || 0}`);
    res.json({ success: true, message: 'Base de datos sincronizada desde n8n' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al guardar JSON';
    console.error('[n8n] Error recibiendo data:', msg);
    res.status(500).json({ error: msg });
  }
});

app.listen(port, () => {
  console.log(`Star Grimoire Backend activo en http://localhost:${port}`);
});
