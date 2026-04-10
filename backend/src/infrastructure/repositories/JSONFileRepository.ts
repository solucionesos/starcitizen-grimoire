import fs from 'fs-extra';
import path from 'node:path';
import { IGameDataRepository } from '../../domain/ports/IGameDataRepository.js';
import { GameData } from '../../domain/models.js';

export class JSONFileRepository implements IGameDataRepository {
  private readonly filePath = path.join(process.cwd(), 'data/db.json');

  async save(data: GameData): Promise<void> {
    await fs.writeJSON(this.filePath, data, { spaces: 2 });
  }

  async getLatestVersion(): Promise<string | null> {
    if (!(await fs.pathExists(this.filePath))) return null;
    const data = await fs.readJSON(this.filePath);
    return data.version || null;
  }

  async getAllMissions(): Promise<any[]> {
    if (!(await fs.pathExists(this.filePath))) return [];
    const data = await fs.readJSON(this.filePath);
    return data.missions || [];
  }

  async getAllBlueprints(): Promise<any[]> {
    if (!(await fs.pathExists(this.filePath))) return [];
    const data = await fs.readJSON(this.filePath);
    return data.blueprints || [];
  }

  async getAllResources(): Promise<any[]> {
    if (!(await fs.pathExists(this.filePath))) return [];
    const data = await fs.readJSON(this.filePath);
    return data.resources || [];
  }
}
