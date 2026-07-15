export interface UexPrice {
  price_buy: number | null;
  terminal_name: string;
  starmap_location?: { name: string; star_system_name: string };
}

export interface Ship {
  id: string;
  name: string;
  image?: string;
  manufacturer?: string;
  description: string;
  description_lore?: string;
  msrp?: number;
  uex_prices?: UexPrice[];
  deflection?: { physical: number; energy: number };
  cargo_capacity?: number;
  speed?: { scm: number; max: number };
  fuel?: { quantum: number; hydrogen: number };
  dimensions?: { length: number; width: number; height: number };
  component_sizes?: { weapon: number; shield: number };
}

export interface VehicleWeapon {
  id: string;
  name: string;
  description_lore?: string;
  size: number;
  type?: string;
  alpha: { physical: number; energy: number };
  projectile_speed?: number;
  fire_rate?: number;
  range?: number;
  dps?: number;
  uex_prices?: UexPrice[];
}

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
  wiki_uuid?: string;
  volume?: number;
  manufacturer?: string;
  description_lore?: string;
  uex_prices?: UexPrice[];
}

export interface Mission {
  id: string;
  name: string;
  faction: string;
  reputation_required: string;
  overview: string;
  probability_rewards: { id?: string; label: string; name?: string }[];
  tips?: string;
  wiki_uuid?: string;
  reward_min?: number;
  reward_max?: number;
  illegal?: boolean;
  faction_uuid?: string;
  description_lore?: string;
}
