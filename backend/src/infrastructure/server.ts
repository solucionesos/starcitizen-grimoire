import express from 'express';
import { JSONFileRepository } from './repositories/JSONFileRepository.js';
import { SCMDBAdapter } from './adapters/SCMDBAdapter.js';
import { WikiAPIAdapter } from './adapters/WikiAPIAdapter.js';
import { UexAPIAdapter } from './adapters/UexAPIAdapter.js';
import { RedditAPIAdapter } from './adapters/RedditAPIAdapter.js';
import { RSIStatusAdapter } from './adapters/RSIStatusAdapter.js';
import { SyncGameDataUseCase } from '../application/use-cases/SyncGameDataUseCase.js';
import { UpdateScheduler } from './cron/UpdateScheduler.js';
import cors from 'cors';
import path from 'path';

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

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
      // Extraer título desde la URL (ej: "21137-This-Week-In-Star-Citizen" → "This Week In Star Citizen")
      const slug = item.url?.split('/').pop() ?? '';
      const titleFromSlug = slug
        .replace(/^\d+-/, '')           // quitar el ID numérico al inicio
        .replace(/-/g, ' ')             // guiones → espacios
        .replace(/\b\w/g, c => c.toUpperCase()); // title case

      // Limpiar HTML del resumen
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

app.post('/api/sync/update', async (req, res) => {
  try {
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
  console.log(`Star Cat Backend running at http://localhost:${port}`);
});
