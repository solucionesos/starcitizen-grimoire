import { Ship, VehicleWeapon } from '../models.js';

export interface IWikiDataFetcher {
  fetchMissionDetails(query: string): Promise<any>;
  fetchItemDetails(query: string): Promise<any>;
  fetchShips(): Promise<Ship[]>;
  fetchVehicleWeapons(): Promise<VehicleWeapon[]>;
}
