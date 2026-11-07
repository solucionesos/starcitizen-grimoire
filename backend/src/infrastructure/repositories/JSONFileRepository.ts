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
    this.syncBundledDataIfNeeded();
  }

  private extractVersionFast(targetPath: string): string | null {
    try {
      if (!fs.pathExistsSync(targetPath)) return null;
      const fd = fs.openSync(targetPath, 'r');
      const buf = Buffer.alloc(512);
      const bytesRead = fs.readSync(fd, buf, 0, 512, 0);
      fs.closeSync(fd);
      const head = buf.subarray(0, bytesRead).toString('utf8');
      const match = head.match(/"version"\s*:\s*"([^"]+)"/);
      if (match && match[1]) return match[1];
      const full = fs.readJSONSync(targetPath);
      return full?.version || null;
    } catch {
      return null;
    }
  }

  private syncBundledDataIfNeeded(): void {
    try {
      const bundledDbPath = path.join(process.cwd(), 'bundled_data/db.json');
      if (fs.pathExistsSync(bundledDbPath)) {
        const bundledVer = this.extractVersionFast(bundledDbPath);
        const currentVer = this.extractVersionFast(this.filePath);

        if (bundledVer && bundledVer !== currentVer) {
          console.log(
            `[JSONFileRepository] Actualizando db.json en volumen persistente: ${currentVer || 'ninguna'} -> ${bundledVer}`
          );
          fs.copyFileSync(bundledDbPath, this.filePath);
          this.cachedData = null;
        }
      }

      const cronTarget = path.join(process.cwd(), 'data/chronicles.json');
      const cronBundled = path.join(process.cwd(), 'bundled_data/chronicles.json');
      if (!fs.pathExistsSync(cronTarget) && fs.pathExistsSync(cronBundled)) {
        fs.copyFileSync(cronBundled, cronTarget);
      }
    } catch (err) {
      console.error('[JSONFileRepository] Error sincronizando bundled_data:', err);
    }
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
