import cron from 'node-cron';
import { SyncGameDataUseCase } from '../../application/use-cases/SyncGameDataUseCase.js';

export class UpdateScheduler {
  constructor(private syncDataUseCase: SyncGameDataUseCase) {}

  public start(): void {
    // Every 6 hours check for updates
    cron.schedule('0 */6 * * *', async () => {
      console.log('[Scheduler] Checking for new game version...');
      try {
        await this.syncDataUseCase.execute();
      } catch (err: any) {
        console.error('[Scheduler] Sync failed (Cloudflare block or offline). Relying on local cache.', err.message);
      }
    });
    
    // Initial check on startup gracefully handled
    this.syncDataUseCase.execute().catch((err: any) => {
      console.error('[Startup] Initial sync check failed. Continuing with existing data cache.', err.message);
    });
  }
}
