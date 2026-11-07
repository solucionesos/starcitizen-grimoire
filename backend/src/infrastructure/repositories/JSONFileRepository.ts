import fs from 'fs-extra';
import path from 'node:path';
import { IGameDataRepository } from '../../domain/ports/IGameDataRepository.js';
import { GameData } from '../../domain/models.js';

export class JSONFileRepository implements IGameDataRepository {
  private readonly filePath: string;
  private cachedData: GameData | null = null;
  private cachedChronicles: any[] | null = null;

  constructor(filePath?: string) {
    this.filePath = filePath || path.join(process.cwd(), 'data/db.json');
  }

  private async loadData(): Promise<GameData | null> {
    if (this.cachedData) return this.cachedData;
    if (!(await fs.pathExists(this.filePath))) return null;
    this.cachedData = await fs.readJSON(this.filePath);
    return this.cachedData;
  }

  async save(data: GameData): Promise<void> {
    await fs.writeJSON(this.filePath, data, { spaces: 2 });
    this.cachedData = data; // Invalidate and update cache immediately
  }

  async getLatestVersion(): Promise<string | null> {
    const data = await this.loadData();
    return data?.version || null;
  }

  async getAllMissions(): Promise<any[]> {
    const data = await this.loadData();
    return data?.missions || [];
  }

  async getAllBlueprints(): Promise<any[]> {
    const data = await this.loadData();
    return data?.blueprints || [];
  }

  async getAllResources(): Promise<any[]> {
    const data = await this.loadData();
    return data?.resources || [];
  }

  async getAllChronicles(): Promise<any[]> {
    if (this.cachedChronicles) return this.cachedChronicles;
    const cronPath = path.join(process.cwd(), 'data/chronicles.json');
    if (!(await fs.pathExists(cronPath))) return [];
    this.cachedChronicles = await fs.readJSON(cronPath);
    return this.cachedChronicles || [];
  }

  async saveChronicle(chronicle: any): Promise<any> {
    const cronPath = path.join(process.cwd(), 'data/chronicles.json');
    const current = await this.getAllChronicles();
    const list = Array.isArray(current) ? [...current] : [];

    const existingIdx = chronicle.id ? list.findIndex((c: any) => c.id === Number(chronicle.id)) : -1;
    let savedItem: any;

    if (existingIdx >= 0) {
      savedItem = { ...list[existingIdx], ...chronicle, id: Number(chronicle.id) };
      list[existingIdx] = savedItem;
    } else {
      const maxId = list.reduce((max: number, c: any) => Math.max(max, Number(c.id) || 0), 0);
      const nextId = chronicle.id ? Number(chronicle.id) : maxId + 1;
      savedItem = { id: nextId, ...chronicle };
      list.push(savedItem);
    }

    await fs.writeJSON(cronPath, list, { spaces: 2 });
    this.cachedChronicles = list;
    return savedItem;
  }

  async getAllShips(): Promise<any[]> {
    const data = await this.loadData();
    return data?.ships || [];
  }

  async getAllVehicleWeapons(): Promise<any[]> {
    const data = await this.loadData();
    return data?.vehicleWeapons || [];
  }

  async getAllVehicleComponents(): Promise<any[]> {
    const data = await this.loadData();
    return data?.vehicleComponents || [];
  }
}
