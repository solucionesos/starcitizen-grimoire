import { JSONFileRepository } from './infrastructure/repositories/JSONFileRepository.js';
import { SCMDBAdapter } from './infrastructure/adapters/SCMDBAdapter.js';
import { SyncGameDataUseCase } from './application/use-cases/SyncGameDataUseCase.js';

const repository = new JSONFileRepository();
const fetcher = new SCMDBAdapter();
const syncUseCase = new SyncGameDataUseCase(repository, fetcher);

console.log('Starting manual sync with absolute latest SCMDBAdapter...');
const start = Date.now();
// Force a full clean sync
await syncUseCase.execute(true);


console.log(`Sync completed in ${(Date.now() - start) / 1000}s`);
process.exit(0);
