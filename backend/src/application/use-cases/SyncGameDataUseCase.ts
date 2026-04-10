import { IGameDataRepository } from '../../domain/ports/IGameDataRepository.js';
import { ISCDataFetcher } from '../../domain/ports/ISCDataFetcher.js';

export class SyncGameDataUseCase {
  constructor(
    private repository: IGameDataRepository,
    private fetcher: ISCDataFetcher
  ) {}

  async execute(force = false): Promise<void> {
    const liveVersion = await this.fetcher.fetchLatestLiveVersion();
    const currentStoredVersion = await this.repository.getLatestVersion();

    if (force || liveVersion !== currentStoredVersion) {
      console.log(`${force ? 'Forced sync triggered.' : 'New version detected: ' + liveVersion}. Starting sync...`);
      const gameData = await this.fetcher.fetchGameData(liveVersion);
      await this.repository.save(gameData);
      console.log(`Sync complete for version: ${liveVersion}`);
    } else {
      console.log(`Version ${liveVersion} is already up to date.`);
    }
  }

}
