import { GameData } from '../models.js';

export interface ISCDataFetcher {
  fetchLatestLiveVersion(): Promise<string>;
  fetchGameData(version: string): Promise<GameData>;
}
