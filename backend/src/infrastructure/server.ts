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

app.listen(port, () => {
  console.log(`Star Cat Backend running at http://localhost:${port}`);
});
