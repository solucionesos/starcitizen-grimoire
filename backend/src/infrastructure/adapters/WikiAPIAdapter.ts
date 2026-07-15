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
    const shipsMap = new Map<string, Ship>();
    let page = 1;
    let lastPage = 1;

    console.log('[WikiAPI] Fetching ships...');
    do {
      try {
        const response = await axios.get(`${this.baseUrl}/vehicles?limit=100&page=${page}&include=components`);
        const data = response.data;
        lastPage = data.meta?.last_page || 1;
        
        for (const item of data.data) {
            // Deduplicar modelos (eliminar sufijos promocionales o variantes cosméticas)
            let baseName = item.name;
            baseName = baseName.replace(/PYAM Exec/i, '')
                               .replace(/Best In Show Edition/i, '')
                               .replace(/Best In Show/i, '')
                               .replace(/Showdown Edition/i, '')
                               .replace(/Edition/i, '')
                               .trim();

            if (!shipsMap.has(baseName)) {
                shipsMap.set(baseName, {
                  id: item.uuid,
                  name: baseName, // Use the cleaned name
                  description: item.description?.es_ES || item.description?.en_EN || item.description || '',
                  ...(item.description ? { description_lore: item.description?.es_ES || item.description?.en_EN || item.description } : {}),
                  ...(item.msrp || (item.skus && item.skus[0]?.price) ? { msrp: item.msrp || (item.skus && item.skus[0]?.price) } : {}),
                  ...(item.images && item.images.length > 0 ? { image: item.images[0].original_url } : {}),
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
                      weapon: this.parseWeapons(item),
                      shield: this.parsePorts(item, ['Shield', 'shield_generators']),
                  }
                });
            }
        }
        page++;
      } catch (err) {
        console.error('[WikiAPI] Error fetching ships:', err);
        break;
      }
    } while (page <= lastPage);

    return Array.from(shipsMap.values());
  }

  private parseWeapons(item: any): string {
      const weaponGroups: string[] = [];

      // 1. Process turrets
      if (item.turrets && typeof item.turrets === 'object') {
          const turretList: any[] = [];
          if (Array.isArray(item.turrets)) {
              turretList.push(...item.turrets);
          } else {
              if (Array.isArray(item.turrets.manned)) turretList.push(...item.turrets.manned);
              if (Array.isArray(item.turrets.remote)) turretList.push(...item.turrets.remote);
              if (Array.isArray(item.turrets.pdc)) turretList.push(...item.turrets.pdc);
          }

          const turretMap: Record<string, number> = {};
          turretList.forEach((t: any) => {
              if (t.weapon_sizes && t.weapon_sizes.length > 0) {
                  const sizeCounts: Record<number, number> = {};
                  t.weapon_sizes.forEach((s: number) => {
                      sizeCounts[s] = (sizeCounts[s] || 0) + 1;
                  });
                  const turretDesc = Object.keys(sizeCounts).map(Number).sort((a,b)=>b-a)
                      .map(s => `${sizeCounts[s]}x${s}`)
                      .join(' + ');
                  turretMap[turretDesc] = (turretMap[turretDesc] || 0) + 1;
              }
          });
          
          Object.entries(turretMap).forEach(([desc, count]) => {
              weaponGroups.push(`${count}x${desc}`);
          });
      }

      // 2. Process fixed weapons
      if (item.ports && Array.isArray(item.ports)) {
          const fixedPorts = item.ports.filter((p: any) => p.type === 'WeaponGun');
          const fixedCounts: Record<number, number> = {};
          fixedPorts.forEach((p: any) => {
              const max = p.sizes?.max;
              if (max !== undefined && max > 0) {
                  fixedCounts[max] = (fixedCounts[max] || 0) + 1;
              }
          });
          const fixedDesc = Object.keys(fixedCounts).map(Number).sort((a,b)=>b-a).map(s => {
              return `${fixedCounts[s]}x${s}`;
          });
          weaponGroups.push(...fixedDesc);
      }

      if (weaponGroups.length === 0 && Array.isArray(item.components)) {
          const weaponComponents = item.components.filter((c: any) => c.type === 'weapons' || c.type === 'turrets');
          
          const fixedCounts: Record<number, number> = {};
          const turretMap: Record<string, number> = {};

          const sizeMap: Record<string, number> = { 'S': 1, 'M': 2, 'L': 3, 'C': 4 };
          weaponComponents.forEach((c: any) => {
              if (c.type === 'weapons') {
                  let size = Number(c.size) || Number(c.component_size);
                  if (isNaN(size) && typeof c.size === 'string') size = sizeMap[c.size.toUpperCase()] || 0;
                  if (isNaN(size) && typeof c.component_size === 'string') size = sizeMap[c.component_size.toUpperCase()] || 0;
                  
                  const mounts = Number(c.mounts) || 1;
                  if (size > 0) {
                      fixedCounts[size] = (fixedCounts[size] || 0) + mounts;
                  }
              } else if (c.type === 'turrets') {
                  let size = Number(c.size) || Number(c.component_size);
                  if (isNaN(size) && typeof c.size === 'string') size = sizeMap[c.size.toUpperCase()] || 0;
                  if (isNaN(size) && typeof c.component_size === 'string') size = sizeMap[c.component_size.toUpperCase()] || 0;
                  
                  const mounts = Number(c.mounts) || 1;
                  if (size > 0) {
                      const desc = `${mounts}x${size}`;
                      turretMap[desc] = (turretMap[desc] || 0) + 1;
                  }
              }
          });

          Object.entries(turretMap).forEach(([desc, count]) => {
              weaponGroups.push(`${count}x${desc}`);
          });
          const fixedDesc = Object.keys(fixedCounts).map(Number).sort((a,b)=>b-a).map(s => {
              return `${fixedCounts[s]}x${s}`;
          });
          weaponGroups.push(...fixedDesc);
      }

      if (weaponGroups.length === 0) return '?';
      return weaponGroups.join(', ');
  }

  private parsePorts(item: any, validTypes: string[]): string {
      const ports = item.ports;
      if (!ports || !Array.isArray(ports)) {
          // Fallback to components
          if (Array.isArray(item.components)) {
              const relevantComponents = item.components.filter((c: any) => validTypes.includes(c.type));
              if (relevantComponents.length === 0) return '?';

              const sizeMap: Record<string, number> = { 'S': 1, 'M': 2, 'L': 3, 'C': 4 };
              const sizeCounts: Record<number, number> = {};
              relevantComponents.forEach((c: any) => {
                  let size = Number(c.size) || Number(c.component_size);
                  if (isNaN(size) && typeof c.size === 'string') size = sizeMap[c.size.toUpperCase()] || 0;
                  if (isNaN(size) && typeof c.component_size === 'string') size = sizeMap[c.component_size.toUpperCase()] || 0;

                  const mounts = Number(c.mounts) || Number(c.quantity) || 1;
                  if (size > 0) {
                      sizeCounts[size] = (sizeCounts[size] || 0) + mounts;
                  }
              });

              const sizes = Object.keys(sizeCounts).map(Number).sort((a, b) => b - a);
              if (sizes.length === 0) return '?';
              return sizes.map(size => `${sizeCounts[size]}x${size}`).join(', ');
          }
          return '?';
      }

      const relevantPorts = ports.filter((p: any) => validTypes.includes(p.type) || validTypes.includes(p.sub_type));
      if (relevantPorts.length === 0) {
          // Fallback to components
          if (Array.isArray(item.components)) {
              const relevantComponents = item.components.filter((c: any) => validTypes.includes(c.type));
              if (relevantComponents.length === 0) return '?';

              const sizeMap: Record<string, number> = { 'S': 1, 'M': 2, 'L': 3, 'C': 4 };
              const sizeCounts: Record<number, number> = {};
              relevantComponents.forEach((c: any) => {
                  let size = Number(c.size) || Number(c.component_size);
                  if (isNaN(size) && typeof c.size === 'string') size = sizeMap[c.size.toUpperCase()] || 0;
                  if (isNaN(size) && typeof c.component_size === 'string') size = sizeMap[c.component_size.toUpperCase()] || 0;

                  const mounts = Number(c.mounts) || Number(c.quantity) || 1;
                  if (size > 0) {
                      sizeCounts[size] = (sizeCounts[size] || 0) + mounts;
                  }
              });

              const sizes = Object.keys(sizeCounts).map(Number).sort((a, b) => b - a);
              if (sizes.length === 0) return '?';
              return sizes.map(size => `${sizeCounts[size]}x${size}`).join(', ');
          }
          return '?';
      }

      const sizeCounts: Record<number, number> = {};
      relevantPorts.forEach((p: any) => {
          const max = p.sizes?.max;
          if (max !== undefined && max > 0) {
              sizeCounts[max] = (sizeCounts[max] || 0) + 1;
          }
      });

      const sizes = Object.keys(sizeCounts).map(Number).sort((a, b) => b - a);
      if (sizes.length === 0) return '?';

      return sizes.map(size => `${sizeCounts[size]}x${size}`).join(', ');
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
