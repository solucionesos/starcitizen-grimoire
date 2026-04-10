export interface Resource {
  id: string;
  name: string;
  parent: string;
  nodes: string | number;
  type: string;
  locations: string[];
  locationsDetail?: { name: string; system: string; type: string; clustering?: string }[];
  rarity?: string;
  baseEmission?: number;
}

export interface Mission {
  id: string;
  name: string;
  faction: string;
  reputation_required: string;
  overview: string;
  probability_rewards: { id?: string; label: string; name?: string }[];
  tips?: string;
}

export interface Blueprint {
  id: string;
  name: string;
  type?: string;
  missions?: { id: string; name: string }[];
  parts: { label: string; amount: number; resourceId?: string | null }[];
}

export interface GameData {
  version: string;
  missions: Mission[];
  blueprints: Blueprint[];
  resources: Resource[];
}
