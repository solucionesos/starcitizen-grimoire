import { IGameDataRepository } from '../../domain/ports/IGameDataRepository.js';
import { ISCDataFetcher } from '../../domain/ports/ISCDataFetcher.js';
import { IWikiDataFetcher } from '../../domain/ports/IWikiDataFetcher.js';

export class SyncGameDataUseCase {
  constructor(
    private repository: IGameDataRepository,
    private fetcher: ISCDataFetcher,
    private wikiFetcher?: IWikiDataFetcher
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
