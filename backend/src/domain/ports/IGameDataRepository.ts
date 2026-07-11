import { GameData } from '../models.js';

export interface IGameDataRepository {
  save(data: GameData): Promise<void>;
  getLatestVersion(): Promise<string | null>;
  getAllMissions(): Promise<any[]>;
  getAllBlueprints(): Promise<any[]>;
  getAllResources(): Promise<any[]>;
  getAllChronicles(): Promise<any[]>;
  getAllShips(): Promise<any[]>;
  getAllVehicleWeapons(): Promise<any[]>;
}
