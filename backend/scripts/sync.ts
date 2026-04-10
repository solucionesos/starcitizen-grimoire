import { JSONFileRepository } from '../src/infrastructure/repositories/JSONFileRepository';
import { SCMDBAdapter } from '../src/infrastructure/adapters/SCMDBAdapter';
import { SyncGameDataUseCase } from '../src/application/use-cases/SyncGameDataUseCase';

async function main() {
  const repository = new JSONFileRepository();
  const fetcher = new SCMDBAdapter();
  const syncUseCase = new SyncGameDataUseCase(repository, fetcher);
  
  console.log('Force syncing game data...');
  await syncUseCase.execute();
  console.log('Sync complete!');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
