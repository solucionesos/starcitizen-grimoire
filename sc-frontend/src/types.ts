export interface UexPrice {
  price_buy: number | null;
  terminal_name: string;
  starmap_location?: { name: string; star_system_name: string };
}

export interface Ship {
  id: string;
  name: string;
  className?: string;
  image?: string;
  images?: { thumbnail_url?: string; original_url?: string }[];
  manufacturer?: string | { name: string; code?: string; uuid?: string; link?: string };
  description: string;
  description_lore?: string;
  msrp?: number;
  uex_prices?: { purchase?: UexPrice[]; rental?: UexPrice[] } | UexPrice[];
  prices?: UexPrice[];
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
  friendly_name?: string;
  system?: string;
  mission_type?: string;
  faction: string;
  reputation_required: string;
  overview: string;
  probability_rewards: { id?: string; label: string; name?: string }[];
  script_items?: { id: string; name: string; count?: number }[];
  tactical_analysis?: { type: string; text: string }[];
  tips?: string;
  wiki_uuid?: string;
  reward_min?: number;
  reward_max?: number;
  credits?: number;
  standing?: number;
  illegal?: boolean;
  faction_uuid?: string;
  description_lore?: string;
}

// --- Tipos de la Hermandad (Ancalagon Oblivion Fleet) ---

export interface RankInfo {
  id: string;
  level: number;
  name: string;
  title?: string;
  archetype?: string;
  description?: string;
  color: string;
}

export interface BrotherProfile {
  id: string;
  discord_id: string;
  discord_username: string;
  discord_avatar?: string;
  display_name: string;
  rsi_handle?: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  role: 'visitante' | 'neofito' | 'hermano' | 'oficial' | 'consejo' | 'admin';
  rank: RankInfo;
  cargo: string;
  specialties: string[];
  bio?: string;
  created_at: string;
}

export interface Objective {
  id: string;
  title: string;
  description?: string;
  scope: 'individual' | 'cargo' | 'org';
  status: 'propuesto' | 'activo' | 'en_progreso' | 'cumplido' | 'marca_del_abismo' | 'abandonado' | 'ceniza_fria';
  progress: number;
  category: 'recoleccion' | 'combate' | 'ascenso' | 'forja' | 'general';
  due_date?: string;
  creator_id: string;
  creator_name?: string;
  assigned_to?: string;
  assignee_name?: string;
  assignee_cargo?: string;
  linked_mandate_id?: string;
  linked_recipe_id?: string;
  verified_by?: string;
  created_at: string;
}

export interface Crusade {
  id: string;
  title: string;
  description: string;
  briefing?: string;
  operation_date: string;
  location: string;
  status: 'convocada' | 'en_curso' | 'victoriosa' | 'archivada';
  creator_id: string;
  creator_name?: string;
  ships_required: string[];
  max_brothers: number;
  signups_count: number;
  user_is_signed: boolean;
  created_at: string;
}

export interface PollOption {
  id: string;
  poll_id: string;
  label: string;
  description?: string;
  metadata?: string;
  votes_count: number;
}

export interface Poll {
  id: string;
  title: string;
  description?: string;
  poll_type: 'cruzada' | 'convocatoria' | 'designio' | 'libre';
  status: 'open' | 'closed';
  opens_at: string;
  closes_at: string;
  creator_id: string;
  creator_name?: string;
  min_rank_level: number;
  winner_option_id?: string;
  total_votes: number;
  user_voted_option_id?: string;
  options: PollOption[];
  created_at: string;
}

export interface Verdict {
  id: string;
  poll_id: string;
  title: string;
  poll_type: string;
  winner_label: string;
  total_votes: number;
  summary: string;
  action_taken?: string;
  closed_at: string;
  is_public?: boolean;
}
