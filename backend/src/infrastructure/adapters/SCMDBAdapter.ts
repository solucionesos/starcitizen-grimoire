import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { ISCDataFetcher } from '../../domain/ports/ISCDataFetcher.js';
import { GameData } from '../../domain/models.js';

// Bypass Cloudflare bot-blocks by masking as standard Chromium browser.
axios.defaults.headers.common['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const EMISSION_DATA = [
  {"name": "Ice", "rarity": "Common", "emission": 4300},
  {"name": "Aluminum", "rarity": "Common", "emission": 4285},
  {"name": "Iron", "rarity": "Common", "emission": 4270},
  {"name": "Silicon", "rarity": "Common", "emission": 4255},
  {"name": "Copper", "rarity": "Common", "emission": 4240},
  {"name": "Corundum", "rarity": "Common", "emission": 4225},
  {"name": "Quartz", "rarity": "Common", "emission": 4210},
  {"name": "Tin", "rarity": "Common", "emission": 4195},
  {"name": "Hephaestanite", "rarity": "Common", "emission": 4180},
  {"name": "Torite", "rarity": "Uncommon", "emission": 3900},
  {"name": "Agricium", "rarity": "Uncommon", "emission": 3885},
  {"name": "Tungsten", "rarity": "Uncommon", "emission": 3870},
  {"name": "Titanium", "rarity": "Uncommon", "emission": 3855},
  {"name": "Aslarite", "rarity": "Uncommon", "emission": 3840},
  {"name": "Laranite", "rarity": "Uncommon", "emission": 3825},
  {"name": "Bexalite", "rarity": "Rare", "emission": 3600},
  {"name": "Gold", "rarity": "Rare", "emission": 3585},
  {"name": "Borase", "rarity": "Rare", "emission": 3570},
  {"name": "Taranite", "rarity": "Rare", "emission": 3555},
  {"name": "Beryl", "rarity": "Rare", "emission": 3540},
  {"name": "Lindinium", "rarity": "Epic", "emission": 3400},
  {"name": "Riccite", "rarity": "Epic", "emission": 3385},
  {"name": "Ouratite", "rarity": "Epic", "emission": 3370},
  {"name": "Savrilium", "rarity": "Legendary", "emission": 3200},
  {"name": "Stileron", "rarity": "Legendary", "emission": 3185},
  {"name": "Quantainium", "rarity": "Legendary", "emission": 3170}
];

export class SCMDBAdapter implements ISCDataFetcher {
  private readonly baseUrl = 'https://scmdb.net/data';

  async fetchLatestLiveVersion(): Promise<string> {
    const { data } = await axios.get(`${this.baseUrl}/versions.json`);
    return data[0]?.version || ""; // e.g. "4.7.0-live.11576750"
  }

  async fetchGameData(version: string): Promise<GameData> {
    const [missions, blueprints, mining] = await Promise.all([
      axios.get(`${this.baseUrl}/merged-${version}.json`),
      axios.get(`${this.baseUrl}/crafting_blueprints-${version}.json`),
      axios.get(`${this.baseUrl}/mining_data-${version}.json`)
    ]);

    const missionsData = missions.data.missions || missions.data;
    const factions = missionsData.factions || {};
    const contracts = missionsData.contracts || [];
    const blueprintList = blueprints.data.blueprints || blueprints.data || [];
    const blueprintPools = missions.data.blueprintPools || {};

    const { blueprintToMissions, missionToBlueprints } = this.linkMissionsAndBlueprints(
      contracts,
      blueprintList,
      blueprintPools
    );

    const missionsTransformed = this.transformMissions(
      contracts,
      factions,
      missionsData,
      missionToBlueprints
    );

    const blueprintsTransformed = this.transformBlueprints(
      blueprintList,
      contracts,
      blueprintToMissions,
      mining.data.mineableElements || {}
    );

    const resourcesTransformed = this.transformResources(mining.data);

    return {
      version,
      missions: missionsTransformed,
      blueprints: blueprintsTransformed,
      resources: resourcesTransformed
    };
  }

  private linkMissionsAndBlueprints(contracts: any[], blueprintList: any[], blueprintPools: any) {
    const blueprintToMissions: Record<string, string[]> = {};
    const missionToBlueprints: Record<string, any[]> = {};

    contracts.forEach((c: any) => {
      if (!c) return;
      const rewards: any[] = [];
      const cTitle = (c.debugName || "").toLowerCase();
      const cDesc = (c.description || "").toLowerCase();

      this.processBlueprintRewards(c, blueprintPools, blueprintList, rewards);
      this.processPayouts(c, blueprintList, rewards);
      this.processNameBasedMapping(cTitle, cDesc, blueprintList, rewards);

      if (rewards.length > 0) {
        missionToBlueprints[c.id] = rewards;
        rewards.forEach(r => {
          const btm = blueprintToMissions[r.id] || [];
          if (!btm.includes(c.id)) {
            btm.push(c.id);
            blueprintToMissions[r.id] = btm;
          }
        });
      }
    });

    return { blueprintToMissions, missionToBlueprints };
  }

  private processBlueprintRewards(c: any, blueprintPools: any, blueprintList: any[], rewards: any[]) {
    if (!Array.isArray(c.blueprintRewards)) return;

    c.blueprintRewards.forEach((r: any) => {
      const poolItems = blueprintPools[r.blueprintPool]?.blueprints || [];
      poolItems.forEach((poolItem: any) => {
        const itemName = typeof poolItem === 'string' ? poolItem : poolItem.name;
        if (!itemName) return;

        const bp = blueprintList.find((b: any) => (b.productName || "").toLowerCase() === itemName.toLowerCase());
        if (bp && !rewards.some(existing => existing.id === bp.guid)) {
          rewards.push({ id: bp.guid, label: bp.productName });
        }
      });
    });
  }

  private processPayouts(c: any, blueprintList: any[], rewards: any[]) {
    c.payouts?.forEach((p: any) => {
      if (p.blueprintId) {
        const bp = blueprintList.find((b: any) => b.guid === p.blueprintId);
        if (bp && !rewards.some(r => r.id === bp.guid)) {
          rewards.push({ id: p.blueprintId, label: bp.productName });
        }
      }
    });
  }

  private processNameBasedMapping(cTitle: string, cDesc: string, blueprintList: any[], rewards: any[]) {
    blueprintList.forEach((bp: any) => {
      const bpName = (bp.productName || "").toLowerCase();
      const cleanBpName = bpName.replaceAll(/\(.*\)/g, '').trim();
      if (cleanBpName.length > 4 && (cTitle.includes(cleanBpName) || cDesc.includes(cleanBpName))) {
        if (!rewards.some(r => r.id === bp.guid)) {
          rewards.push({ id: bp.guid, label: bp.productName });
        }
      }
    });
  }

  private transformMissions(contracts: any[], factions: any, missionsData: any, missionToBlueprints: Record<string, any[]>) {
    let mapping: Record<string, string> = {};
    try {
      const mappingPath = path.join(process.cwd(), 'data', 'scmdb_mission_mapping.json');
      if (fs.existsSync(mappingPath)) {
        const raw = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
        mapping = raw.mapping || {};
      }
    } catch (e) {
      console.warn('[Adapter] No se pudo cargar scmdb_mission_mapping.json, usando nombres base.');
    }

    return contracts.map((c: any) => {
      const factionRewardsPools = missionsData.factionRewardsPools || {};
      const fRewardPool = factionRewardsPools[c.factionRewardsIndex] || [];
      const standing = fRewardPool.reduce((acc: number, s: any) => acc + (s.amount || 0), 0);

      const allItemSources = [
        ...(c.rewards || []),
        ...(c.itemRewards || []),
        ...(c.payouts || []),
        ...(missionsData.partialRewardPayoutPools?.[c.partialRewardPayoutIndex] || [])
      ];

      const flatItems = allItemSources.flatMap(item => 
        (item.type === 'weighted_choice' && item.choices) ? item.choices : [item]
      );

      const sItems = flatItems
        .filter((item: any) => (item.name || "").toLowerCase().includes("scrip"))
        .map((item: any) => ({ name: item.name, amount: item.amount || 1 }));
      
      // Limpieza de nombre técnica en caso de falta de mapeo
      let displayName = mapping[c.id] || mapping[c.debugName] || c.debugName || c.titleLocKey || c.id;
      if (displayName === c.debugName || displayName === c.id) {
        displayName = displayName
          .replace(/^(CFP|HH|RR|XT|TarPits)_/i, '')
          .replace(/_/g, ' ')
          .trim();
      }

      // Detección de Sistema
      let system = 'Desconocido';
      if (c.debugName?.includes('Pyro')) system = 'Pyro';
      else if (c.debugName?.includes('Stanton')) system = 'Stanton';
      else if (c.debugName?.includes('Nyx')) system = 'Nyx';

      // Detección de Tipo de Edicto
      let mType = c.missionType || 'Otro';
      if (mType === 'Otro') {
        const typeMatch = c.debugName?.match(/_(Courier|EliminateAll|Assassination|Salvage|Bounty|Investigation|Repair|Sabotage|Cargo|Delivery|Mercenary|Xenothreat|Overdrive|Infiltrate|Extraction)_/i);
        if (typeMatch) mType = typeMatch[1];
        else if (c.debugName?.includes('Courier')) mType = 'Courier';
        else if (c.description?.toLowerCase().includes('entrega')) mType = 'Courier';
      }

      return {
        id: c.id,
        name: displayName,
        system,
        mission_type: mType,
        faction: factions[c.factionGuid]?.name || 'Independent',
        reputation_required: c.minStanding?.name || 'Neutral',
        credits: c.rewardUEC || 0,
        standing,
        has_script: sItems.length > 0,
        script_items: sItems,
        overview: c.description || 'No description available for this contract.',
        probability_rewards: missionToBlueprints[c.id] || [],
        tips: c.tokenSubstitutions?.['Contractor|SignOff'] || 'Standard operation procedures apply.',
        tactical_analysis: generateTacticalTips(c)
      };
    });
  }

  private transformBlueprints(blueprintList: any[], contracts: any[], blueprintToMissions: Record<string, string[]>, mineableElements: any) {
    return blueprintList.map((bp: any) => ({
      id: bp.guid,
      name: bp.productName,
      tag: bp.tag,
      type: bp.type,
      missions: (blueprintToMissions[bp.guid] || []).map((mId: string) => {
        const matched = contracts.find((c: any) => c.id === mId);
        return { id: mId, name: matched?.debugName || 'MISSION' };
      }),
      parts: bp.tiers?.[0]?.slots?.map((slot: any) => {
        const option = slot.options?.[0];
        const resourceName = option?.resourceName || option?.name || option?.itemName || option?.itemGuid || 'Unknown';
        const resourceMatch = Object.entries(mineableElements).find(
          ([_, res]: [string, any]) => res.name === resourceName
        );
        return {
          label: resourceName,
          resourceId: resourceMatch?.[0] || null,
          amount: option?.quantity || 0,
          type: option?.type
        };
      }) || []
    }));
  }

  private transformResources(miningData: any) {
    const mineableElements = miningData.mineableElements || {};
    const compositions = miningData.compositions || {};
    const locations = miningData.locations || [];
    const elementToLocations: Record<string, any[]> = {};

    locations.forEach((loc: any) => {
      this.processLocation(loc, miningData, elementToLocations);
    });

    return Object.keys(elementToLocations).map((id) => {
      const locs = elementToLocations[id] || [];
      const systems = Array.from(new Set(locs.map(l => l.system)));
      const typesFound = Array.from(new Set(locs.map(l => l.miningType)));
      
      const data = mineableElements[id];
      let name = data?.name;
      if (!name) {
        const compGuid = Object.keys(compositions).find(cId => 
          (compositions[cId].parts || compositions[cId].elements || []).some((p: any) => p.elementGuid === id)
        );
        name = compGuid ? compositions[compGuid].name : id;
      }

      const emInfo = EMISSION_DATA.find(e => name.toLowerCase().includes(e.name.toLowerCase()));
      return {
        id,
        name,
        parent: systems.length > 0 ? systems.join(' / ') : 'Stanton',
        nodes: data?.nodes || data?.abundance || 'N/A',
        type: typesFound.length > 1 ? typesFound.join(' / ') : (typesFound[0] || 'Other'),
        locations: locs.map(l => `${l.system}: ${l.name} (${l.bodyType})`),
        locationsDetail: locs.map(l => ({ name: l.name, system: l.system, type: l.bodyType, clustering: l.clustering })),
        rarity: emInfo?.rarity || data?.rarity || 'Common',
        baseEmission: emInfo?.emission || data?.scanSignature || 4000
      };
    });
  }

  private getMiningType(groupName: string): string {
    if (groupName?.includes('FPS')) return 'FPS';
    if (groupName?.includes('ROC')) return 'ROC';
    if (groupName?.includes('Harvest')) return 'Harvest';
    return 'Ship';
  }

  private getClusteringInfo(cGuid: string, presets: any, miningType: string): string {
    const preset = presets?.[cGuid];
    if (preset?.params?.length > 0) {
      const sizes = preset.params.map((p: any) => ({ min: p.minSize, max: p.maxSize }));
      const min = Math.min(...sizes.map((s: any) => s.min));
      const max = Math.max(...sizes.map((s: any) => s.max));
      const unit = miningType === 'Harvest' ? 'plants' : 'rocks';
      return min === max ? `${min} ${unit}` : `${min}-${max} ${unit}`;
    }
    return '1 item';
  }

  private addLocationToElement(map: Record<string, any[]>, elId: string, loc: any) {
    map[elId] ??= [];
    const exists = map[elId].some(l => l.name === loc.name && l.miningType === loc.miningType);
    if (!exists) {
      map[elId].push(loc);
    }
  }

  private processLocation(loc: any, miningData: any, elementToLocations: Record<string, any[]>) {
    const locSystem = loc.system || 'Stanton';
    const locName = loc.locationName || 'Unknown';
    const bodyType = loc.locationType || 'Planet';
    const compositions = miningData.compositions || {};

    loc.groups?.forEach((group: any) => {
      const miningType = this.getMiningType(group.groupName);
      group.deposits?.forEach((dep: any) => {
        this.processDeposit(dep, { system: locSystem, name: locName, bodyType, miningType }, miningData, elementToLocations, compositions);
      });
    });
  }

  private processDeposit(dep: any, locInfo: any, miningData: any, elementToLocations: Record<string, any[]>, compositions: any) {
    const clustering = this.getClusteringInfo(dep.clusteringPresetGuid, miningData.clusteringPresets, locInfo.miningType);
    const compGuid = dep.compositionGuid;

    if (compGuid && compositions[compGuid]) {
      const currentComps = compositions[compGuid].parts || compositions[compGuid].elements || [];
      currentComps.forEach((part: any) => {
        if (part.elementGuid) {
          this.addLocationToElement(elementToLocations, part.elementGuid, { ...locInfo, clustering });
        }
      });
    } else if (dep.presetName) {
      this.addLocationToElement(elementToLocations, dep.presetName, { ...locInfo, clustering });
    }
  }
}

function generateTacticalTips(c: any): any[] {
  const tips: any[] = [];
  const name = (c.debugName || c.titleLocKey || "").toLowerCase();
  
  const isBounty = name.includes('bounty') || name.includes('hh_') || name.includes('assassination') || name.includes('ambush');
  const isFPS = name.includes('bunker') || name.includes('survival') || name.includes('evict') || name.includes('defense') || name.includes('fps');
  const isCollector = name.includes('collector') || name.includes('breaker') || name.includes('wikelo') || name.includes('shubin');
  const isSalvage = name.includes('salvage') || name.includes('hull_scrape') || name.includes('unverified');

  if (isSalvage) {
    tips.push(
      { type: 'speedrun', content: "Meta Hull-C: Acepta contratos unverified de 20k en Hurston. Si no es un Hull-C, abandona y busca de nuevo." },
      { type: 'bug_avoidance', content: "4.7 Cargo Bug: Mueve cajas de Stims individualmente con el tractor beam 'MaxLift' para evitar clipping explosivo." },
      { type: 'pro', content: "Estrategia PRO: Enfócate 100% en extraer Stims y Medical Supplies. Vende todo en TDD de HUR-L1." }
    );
  } else if (isCollector) {
    tips.push(
      { type: 'speedrun', content: "Operation Breaker (Nyx): Usa el monorraíl para llegar al Warehouse inmediatamente." },
      { type: 'pro', content: "Sinergia Shubin: Sube a Rep 2 para desbloquear el Láser de Minería Masivo." },
      { type: 'loadout', content: "Equipa un traje térmico industrial. Las estaciones Breaker en Nyx tienen fugas de refrigerante." }
    );
  } else if (isBounty) {
    tips.push(
      { type: 'speedrun', content: "Quantum Offset: Salta a un OM cercano al objetivo primero. Inicia el combate a < 2km." },
      { type: 'bug_avoidance', content: "Desync Warning: En 4.7, las Valkyries enemigas teletransportan. No uses misiles a menos de 3km." },
      { type: 'loadout', content: "Ballistics Meta: Los AD5B siguen siendo intocables por su capacidad de penetración de escudos." }
    );
  } else if (isFPS) {
    tips.push(
      { type: 'speedrun', content: "Tactor Beam Looting: Mueve las cajas completas a tu nave y revísalas en puerto seguro." },
      { type: 'pro', content: "Stealth T0: Usa armas con silenciador (C54/FS-9). La IA tiene 'cone vision' mejorado en 4.7." },
      { type: 'pro', content: "Blueprint Drop: Enemigos con armadura dorada tienen 15% drop de Blueprints de Grado A." }
    );
  } else {
    tips.push(
      { type: 'speedrun', content: "Quantum Nav Mode: Mantén escudos al 100% mientras cargas el motor para saltos rápidos." },
      { type: 'pro', content: "Atmospheric Efficiency: Sube a 10km en ángulo de 45° antes de saltar en planetas con atmósfera." }
    );
  }

  return tips;
}
