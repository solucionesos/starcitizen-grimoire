import axios from 'axios';
import { IWikiDataFetcher } from '../../domain/ports/IWikiDataFetcher.js';
import { Ship, VehicleWeapon, UexPrice } from '../../domain/models.js';

export class WikiAPIAdapter implements IWikiDataFetcher {
  private readonly baseUrl = 'https://api.star-citizen.wiki/api/v2';

  private extractUexPrices(item: any): UexPrice[] {
    const prices: UexPrice[] = [];
    if (item.uex_prices?.purchase) {
      for (const p of item.uex_prices.purchase) {
        prices.push({
          price_buy: p.price_buy,
          terminal_name: p.terminal_name,
          ...(p.starmap_location ? {
            starmap_location: {
              name: p.starmap_location.name,
              star_system_name: p.starmap_location.star_system_name
            }
          } : {})
        });
      }
    }
    return prices;
  }

  async fetchShips(): Promise<Ship[]> {
    const ships: Ship[] = [];
    let page = 1;
    let lastPage = 1;

    console.log('[WikiAPI] Fetching ships...');
    do {
      try {
        const response = await axios.get(`${this.baseUrl}/vehicles?limit=100&page=${page}`);
        const data = response.data;
        lastPage = data.meta?.last_page || 1;
        
        for (const item of data.data) {
            ships.push({
              id: item.uuid,
              name: item.name,
              description: item.description?.es_ES || item.description?.en_EN || item.description || '',
              ...(item.description ? { description_lore: item.description?.es_ES || item.description?.en_EN || item.description } : {}),
              ...(item.msrp || (item.skus && item.skus[0]?.price) ? { msrp: item.msrp || (item.skus && item.skus[0]?.price) } : {}),
              uex_prices: this.extractUexPrices(item),
              ...(item.armor?.deflection ? {
                deflection: {
                  physical: item.armor.deflection.physical || 0,
                  energy: item.armor.deflection.energy || 0
                }
              } : {}),
              cargo_capacity: item.cargo_capacity || 0,
              speed: {
                  scm: item.speed?.scm || 0,
                  max: item.speed?.max || 0,
              },
              fuel: {
                  quantum: item.quantum?.quantum_fuel_capacity || 0,
                  hydrogen: item.fuel?.capacity || 0,
              },
              dimensions: {
                  length: item.dimension?.length || 0,
                  width: item.dimension?.width || 0,
                  height: item.dimension?.height || 0,
              },
              component_sizes: {
                  weapon: item.power_pools?.WeaponGun?.size || 0,
                  shield: item.power_pools?.Shield?.size || 0,
              }
            });
        }
        page++;
      } catch (err) {
        console.error('[WikiAPI] Error fetching ships:', err);
        break;
      }
    } while (page <= lastPage);

    return ships;
  }

  async fetchVehicleWeapons(): Promise<VehicleWeapon[]> {
    const weapons: VehicleWeapon[] = [];
    let page = 1;
    let lastPage = 1;

    console.log('[WikiAPI] Fetching vehicle weapons...');
    do {
      try {
        const response = await axios.get(`${this.baseUrl}/items?filter[type]=WeaponGun&limit=100&page=${page}`);
        const data = response.data;
        lastPage = data.meta?.last_page || 1;

        for (const item of data.data) {
          if (item.vehicle_weapon) {
            weapons.push({
              id: item.uuid,
              name: item.name,
              description_lore: item.description?.es_ES || item.description?.en_EN || item.description,
              size: item.size || 1,
              type: item.vehicle_weapon?.type || item.type_label,
              alpha: {
                physical: item.vehicle_weapon?.damage?.alpha?.physical || 0,
                energy: item.vehicle_weapon?.damage?.alpha?.energy || 0,
              },
              projectile_speed: item.vehicle_weapon?.ammunition?.speed || 0,
              fire_rate: item.vehicle_weapon?.rpm || 0,
              range: item.vehicle_weapon?.range || 0,
              dps: item.vehicle_weapon?.damage?.burst || 0,
              uex_prices: this.extractUexPrices(item)
            });
          }
        }
        page++;
      } catch (err) {
        console.error('[WikiAPI] Error fetching vehicle weapons:', err);
        break;
      }
    } while (page <= lastPage);

    return weapons;
  }

  async fetchMissionDetails(query: string): Promise<any> {
    try {
      // The API uses query parameter for searching
      const response = await axios.get(`${this.baseUrl}/missions?search=${encodeURIComponent(query)}`);
      const data = response.data.data;
      if (data && data.length > 0) {
        // Find best match using fuzzy search (Levenshtein)
        let bestMatch = data[0];
        let bestScore = Infinity;
        for (const m of data) {
          const score = this.levenshteinDistance(query.toLowerCase(), (m.title || '').toLowerCase());
          if (score < bestScore) {
            bestScore = score;
            bestMatch = m;
          }
        }
        return bestMatch;
      }
    } catch (err) {
      // Ignore errors for individual items to not break sync
    }
    return null;
  }

  async fetchItemDetails(query: string): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/items?search=${encodeURIComponent(query)}`);
      const data = response.data.data;
      if (data && data.length > 0) {
        let bestMatch = data[0];
        let bestScore = Infinity;
        for (const item of data) {
          const score = this.levenshteinDistance(query.toLowerCase(), (item.name || '').toLowerCase());
          if (score < bestScore) {
            bestScore = score;
            bestMatch = item;
          }
        }
        return bestMatch;
      }
    } catch (err) {
      // Ignore
    }
    return null;
  }

  // Simple Levenshtein distance for fuzzy search matching
  private levenshteinDistance(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0]![j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        const cost = b.charAt(i - 1) === a.charAt(j - 1) ? 0 : 1;
        const val1 = matrix[i - 1]?.[j - 1];
        const val2 = matrix[i]?.[j - 1];
        const val3 = matrix[i - 1]?.[j];
        if (val1 !== undefined && val2 !== undefined && val3 !== undefined) {
          matrix[i]![j] = Math.min(
            val1 + cost, // substitution
            Math.min(
              val2 + 1, // insertion
              val3 + 1 // deletion
            )
          );
        } else {
          matrix[i]![j] = 0;
        }
      }
    }
    return matrix[b.length]?.[a.length] || 0;
  }
}
