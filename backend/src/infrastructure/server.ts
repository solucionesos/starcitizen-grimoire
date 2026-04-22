import express from 'express';
import { JSONFileRepository } from './repositories/JSONFileRepository.js';
import { SCMDBAdapter } from './adapters/SCMDBAdapter.js';
import { SyncGameDataUseCase } from '../application/use-cases/SyncGameDataUseCase.js';
import { UpdateScheduler } from './cron/UpdateScheduler.js';
import cors from 'cors';

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Dependencies Injection (Hexagonal)
const repository = new JSONFileRepository();
const fetcher = new SCMDBAdapter();
const syncUseCase = new SyncGameDataUseCase(repository, fetcher);
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

// ── RSI News Proxy ─────────────────────────────────────────────────────────
// El frontend no puede llamar directamente al feed (CORS). El backend
// lo intercepta server-side, parsea el JSON Feed y devuelve items limpios.
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

app.listen(port, () => {
  console.log(`Star Cat Backend running at http://localhost:${port}`);
});
