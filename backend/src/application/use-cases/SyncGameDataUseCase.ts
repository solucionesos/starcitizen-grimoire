import { IGameDataRepository } from '../../domain/ports/IGameDataRepository.js';
import { ISCDataFetcher } from '../../domain/ports/ISCDataFetcher.js';
import { IWikiDataFetcher } from '../../domain/ports/IWikiDataFetcher.js';
import { UexAPIAdapter } from '../../infrastructure/adapters/UexAPIAdapter.js';

export class SyncGameDataUseCase {
  constructor(
    private repository: IGameDataRepository,
    private fetcher: ISCDataFetcher,
    private wikiFetcher?: IWikiDataFetcher,
    private uexFetcher?: UexAPIAdapter
  ) {}

  async execute(force = false): Promise<void> {
    const liveVersion = await this.fetcher.fetchLatestLiveVersion();
    const currentStoredVersion = await this.repository.getLatestVersion();

    if (force || liveVersion !== currentStoredVersion) {
      console.log(`${force ? 'Forced sync triggered.' : 'New version detected: ' + liveVersion}. Starting sync...`);
      const gameData = await this.fetcher.fetchGameData(liveVersion);

      if (this.wikiFetcher) {
        console.log(`[SyncGameDataUseCase] Enriching with Wiki API...`);

        gameData.ships = await this.wikiFetcher.fetchShips();
        gameData.vehicleWeapons = await this.wikiFetcher.fetchVehicleWeapons();

        if (this.uexFetcher) {
            console.log(`[SyncGameDataUseCase] Overwriting prices with UEX API (LIVE data)...`);
            const uexVehicles = await this.uexFetcher.fetchVehicles();
            const uexVehiclePrices = await this.uexFetcher.fetchVehiclePurchasePrices();

            // Map UEX vehicle prices by vehicle ID
            const vehiclePricesMap = new Map<number, any[]>();
            for (const p of uexVehiclePrices) {
                if (!vehiclePricesMap.has(p.id_vehicle)) {
                    vehiclePricesMap.set(p.id_vehicle, []);
                }
                vehiclePricesMap.get(p.id_vehicle)!.push(p);
            }

            // Map UEX vehicle by name/slug to find ID
            for (const ship of gameData.ships) {
                // Find matching vehicle in UEX by name (ignoring spaces/case, or partial match)
                const uexV = uexVehicles.find(v => 
                    (v.name && ship.name && v.name.toLowerCase() === ship.name.toLowerCase()) || 
                    (v.name_full && ship.name && v.name_full.toLowerCase().includes(ship.name.toLowerCase()))
                );
                
                if (uexV) {
                    let shipImage = undefined;
                    if (uexV.url_photos) {
                        try {
                            const photos = JSON.parse(uexV.url_photos);
                            if (Array.isArray(photos)) {
                                const rsiImage = photos.find((url: string) => url.includes('robertsspaceindustries.com'));
                                if (rsiImage) {
                                    shipImage = rsiImage;
                                }
                            }
                        } catch(e) { }
                    }
                    if (shipImage) {
                        ship.image = shipImage;
                    }
                    if (uexV.company_name) {
                        ship.manufacturer = uexV.company_name;
                    }
                    const prices = vehiclePricesMap.get(uexV.id);
                    if (prices && prices.length > 0) {
                        ship.uex_prices = prices.map(p => ({
                            price_buy: p.price_buy,
                            terminal_name: p.terminal_name,
                            starmap_location: p.planet_name ? {
                                name: p.city_name || p.space_station_name || p.outpost_name || p.planet_name,
                                star_system_name: p.star_system_name
                            } : undefined
                        })) as any;
                    } else {
                        // Clear if not purchasable in live
                        ship.uex_prices = [];
                    }
                }
            }

        }

        for (const mission of gameData.missions) {
          const wikiMission = await this.wikiFetcher.fetchMissionDetails(mission.name);
          if (wikiMission) {
            mission.wiki_uuid = wikiMission.uuid;
            mission.reward_min = wikiMission.reward_min;
            mission.reward_max = wikiMission.reward_max;
            mission.illegal = wikiMission.illegal;
            mission.faction_uuid = wikiMission.faction?.uuid;
            mission.description_lore = wikiMission.description?.es_ES || wikiMission.description?.en_EN || wikiMission.description;
          }
        }

        for (const resource of gameData.resources) {
          const wikiItem = await this.wikiFetcher.fetchItemDetails(resource.name);
          if (wikiItem) {
            resource.wiki_uuid = wikiItem.uuid;
            resource.volume = wikiItem.volume;
            resource.manufacturer = wikiItem.manufacturer?.name;
            resource.description_lore = wikiItem.description?.es_ES || wikiItem.description?.en_EN || wikiItem.description;
            
            if (wikiItem.uex_prices?.purchase) {
              resource.uex_prices = wikiItem.uex_prices.purchase.map((p: any) => ({
                price_buy: p.price_buy,
                terminal_name: p.terminal_name,
                starmap_location: p.starmap_location ? {
                  name: p.starmap_location.name,
                  star_system_name: p.starmap_location.star_system_name
                } : undefined
              }));
            }
          }
        }

        for (const blueprint of gameData.blueprints) {
          const wikiItem = await this.wikiFetcher.fetchItemDetails(blueprint.name);
          if (wikiItem) {
            blueprint.wiki_uuid = wikiItem.uuid;
            blueprint.volume = wikiItem.volume;
            blueprint.manufacturer = wikiItem.manufacturer?.name;
            blueprint.description_lore = wikiItem.description?.es_ES || wikiItem.description?.en_EN || wikiItem.description;
            
            if (wikiItem.uex_prices?.purchase) {
              blueprint.uex_prices = wikiItem.uex_prices.purchase.map((p: any) => ({
                price_buy: p.price_buy,
                terminal_name: p.terminal_name,
                starmap_location: p.starmap_location ? {
                  name: p.starmap_location.name,
                  star_system_name: p.starmap_location.star_system_name
                } : undefined
              }));
            }
          }
        }
      }

      await this.repository.save(gameData);
      console.log(`Sync complete for version: ${liveVersion}`);
    } else {
      console.log(`Version ${liveVersion} is already up to date.`);
    }
  }

}
