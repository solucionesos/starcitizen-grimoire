import { JSONFileRepository } from './infrastructure/repositories/JSONFileRepository.js';
import { SCMDBAdapter } from './infrastructure/adapters/SCMDBAdapter.js';
import { WikiAPIAdapter } from './infrastructure/adapters/WikiAPIAdapter.js';
import { UexAPIAdapter } from './infrastructure/adapters/UexAPIAdapter.js';
import { SyncGameDataUseCase } from './application/use-cases/SyncGameDataUseCase.js';
import path from 'path';

const repository = new JSONFileRepository(path.join(process.cwd(), 'data', 'db.json'));
const fetcher = new SCMDBAdapter();
const wikiFetcher = new WikiAPIAdapter();
const uexFetcher = new UexAPIAdapter();

const syncUseCase = new SyncGameDataUseCase(repository, fetcher, wikiFetcher, uexFetcher);

console.log('Starting manual sync with absolute latest SCMDBAdapter...');
const start = Date.now();
// Force a full clean sync
await syncUseCase.execute(true);


console.log(`Sync completed in ${(Date.now() - start) / 1000}s`);
process.exit(0);
