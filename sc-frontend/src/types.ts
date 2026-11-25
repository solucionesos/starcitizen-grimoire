// --- Union Types (erasableSyntaxOnly: NEVER use enum) ---

export type UserStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type UserRole = 'visitante' | 'neofito' | 'hermano' | 'oficial' | 'consejo' | 'admin';
export type MemberShipStatus = 'operativa' | 'en_forja' | 'reserva';
export type HomeSystem = 'Pyro' | 'Nyx' | 'Stanton' | 'El Vacío' | (string & {});

export type ObjectiveScope = 'individual' | 'cargo' | 'org';
export type ObjectiveStatus =
  | 'propuesto'
  | 'activo'
  | 'en_progreso'
  | 'cumplido'
  | 'marca_del_abismo'
  | 'abandonado'
  | 'ceniza_fria';
export type ObjectiveCategory = 'recoleccion' | 'combate' | 'ascenso' | 'forja' | 'general';

export type CrusadeStatus =
  | 'convocada'
  | 'abierta'
  | 'en_curso'
  | 'victoriosa'
  | 'completada'
  | 'archivada'
  | 'cancelada';
export type PollType = 'cruzada' | 'convocatoria' | 'designio' | 'libre';
export type PollStatus = 'open' | 'closed';

// --- Catalog Types ---

export interface UexPrice {
  price_buy: number | null;
  terminal_name: string;
  starmap_location?: { name: string; star_system_name: string };
}

export interface Ship {
  id: string;
  name: string;
  className?: string;
  focus?: string;
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

export interface BlueprintPart {
  name?: string;
  label?: string;
  amount: number;
  resourceId?: string | null;
}

export interface Blueprint {
  id: string;
  name?: string;
  label?: string;
  type?: string;
  missions?: { id: string; name: string }[];
  parts: BlueprintPart[];
  wiki_uuid?: string;
  volume?: number;
  manufacturer?: string;
  description_lore?: string;
  uex_prices?: UexPrice[];
}

export interface VehicleComponent {
  id: string;
  name: string;
  description_lore?: string;
  size: number;
  type: string;
  manufacturer?: string;
  grade?: string;
  class?: string;
  uex_prices?: UexPrice[];
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

export interface MemberShip {
  id: string;
  user_id: string;
  ship_id: string;
  ship_name: string;
  manufacturer: string;
  ship_class: string;
  callsign: string | null;
  status: MemberShipStatus;
  created_at: string;
}

export interface AbyssalMark {
  id: string;
  user_id: string;
  title: string;
  reason: string;
  awarded_by: string;
  awarded_by_name?: string;
  created_at: string;
}

export interface CouncilAuditLog {
  id: string;
  actor_id: string | null;
  actor_name?: string | null;
  actor_cargo?: string | null;
  action_type: string;
  target_user_id: string | null;
  target_name?: string | null;
  details: string;
  created_at: string;
}

export interface BrotherProfile {
  id: string;
  discord_id: string;
  discord_username?: string | null;
  discord_avatar?: string | null;
  display_name: string;
  rsi_handle?: string | null;
  status: UserStatus;
  role: UserRole;
  rank_id?: string;
  rank_level?: number;
  rank?: RankInfo;
  cargo: string;
  specialties: string[];
  bio?: string | null;
  expected_discord_username?: string | null;
  is_discord_linked?: boolean;
  home_system?: HomeSystem;
  combat_role?: string;
  abyssal_marks?: AbyssalMark[];
  ships?: MemberShip[];
  created_at: string;
  updated_at?: string;
}

// --- Directorio Público OPSEC (/api/hermandad) ---

export interface FleetModelSummary {
  ship_name: string;
  manufacturer: string;
  ship_class: string;
  count: number;
}

export interface FleetClassSummary {
  ship_class: string;
  count: number;
}

export interface PublicFleetSummary {
  total_operational: number;
  by_model: FleetModelSummary[];
  by_class: FleetClassSummary[];
}

export type FleetSummary = PublicFleetSummary;

export interface PublicBrother {
  id: string;
  display_name: string;
  rsi_handle: string | null;
  discord_avatar?: string | null;
  discord_username?: string | null;
  status: UserStatus;
  role: UserRole;
  rank_id: string;
  rank_level: number;
  rank?: RankInfo;
  cargo: string;
  specialties: string[];
  bio: string | null;
  is_discord_linked?: boolean;
  home_system?: HomeSystem;
  combat_role?: string;
  abyssal_marks?: AbyssalMark[];
  ships?: MemberShip[];
  created_at: string;
}

export interface HermandadDirectoryResponse {
  members: PublicBrother[];
  fleet_summary: PublicFleetSummary;
  is_authenticated_brother: boolean;
}

export type PublicHermandadResponse = HermandadDirectoryResponse;

export interface HermandadMemberResponse {
  member: PublicBrother;
  is_authenticated_brother: boolean;
}

export type PublicHermanoResponse = HermandadMemberResponse;

// --- Objectives, Crusades, Polls & Verdicts ---

export interface Objective {
  id: string;
  title: string;
  description?: string;
  scope: ObjectiveScope;
  status: ObjectiveStatus;
  progress: number;
  category: ObjectiveCategory;
  due_date?: string;
  creator_id: string;
  creator_name?: string;
  assigned_to?: string;
  assignee_name?: string;
  assignee_cargo?: string;
  linked_mandate_id?: string;
  linked_recipe_id?: string;
  verified_by?: string;
  verified_at?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Crusade {
  id: string;
  title: string;
  description: string;
  briefing?: string;
  operation_date: string;
  location: string;
  status: CrusadeStatus;
  creator_id: string;
  creator_name?: string;
  creator_cargo?: string;
  ships_required: string[];
  max_brothers: number;
  signups_count: number;
  user_is_signed: boolean;
  roster?: CrusadeSignup[];
  created_at: string;
}

export interface CrusadeSignup {
  id: string;
  crusade_id: string;
  user_id: string;
  member_ship_id?: string | null;
  catalog_ship_id?: string | null;
  ship_brought?: string | null;
  ship_name?: string | null;
  manufacturer?: string | null;
  ship_manufacturer?: string | null;
  ship_class?: string | null;
  ship_callsign?: string | null;
  callsign?: string | null;
  ship_status?: MemberShipStatus | null;
  role_assigned: string;
  joined_at: string;
  display_name?: string;
  rsi_handle?: string | null;
  discord_avatar?: string | null;
  cargo?: string;
  rank_id?: string;
  rank_level?: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start_date: string;
  location: string;
  type: 'cruzada' | 'designio' | 'conclave';
  status: string;
}

export interface CrusadeDetail extends Omit<Crusade, 'signups_count' | 'user_is_signed'> {
  signups_count?: number;
  user_is_signed?: boolean;
  creator_cargo?: string;
  roster: CrusadeSignup[];
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
  poll_type: PollType;
  status: PollStatus;
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
  poll_id?: string;
  title: string;
  poll_type: string;
  winner_label: string;
  total_votes?: number;
  summary: string;
  action_taken?: string | null;
  closed_at: string;
  featured_in_home?: boolean | number;
  is_public?: boolean;
}

export type PollVerdict = Verdict;

// --- Chronicles (Lectitio Divinitatus & Concilio Editor) ---

export type ChronicleBlockType = 'p' | 'quote' | 'header' | 'grid';

export interface ChronicleGridItem {
  icon: string;
  title: string;
  text: string;
}

export interface ChronicleBlock {
  type: ChronicleBlockType;
  text?: string;
  muted?: boolean;
  icon?: string;
  title?: string;
  items?: ChronicleGridItem[];
}

export interface Chronicle {
  id: number;
  title: string;
  subtitle: string;
  date: string;
  dateSort: number;
  classification: string;
  icon: string;
  color: string;
  blocks: ChronicleBlock[];
}

// --- API Request / Response Payloads ---

export interface UpdateProfilePayload {
  rsi_handle?: string | null;
  bio?: string | null;
  display_name?: string;
  specialties?: string[];
  home_system?: string;
  combat_role?: string;
}

export interface CreateMemberShipPayload {
  ship_id: string;
  ship_name: string;
  manufacturer?: string;
  ship_class?: string;
  callsign?: string | null;
  status?: MemberShipStatus;
}

export interface UpdateMemberShipPayload {
  callsign?: string | null;
  status?: MemberShipStatus;
  ship_name?: string;
  manufacturer?: string;
  ship_class?: string;
}

export interface CrusadeSignupPayload {
  member_ship_id?: string | null;
  ship_brought?: string | null;
  role_assigned: string;
}

export interface CouncilUsersResponse {
  users: BrotherProfile[];
  pending_count: number;
}

export interface PreregisterUserPayload {
  display_name: string;
  rsi_handle?: string | null;
  expected_discord_username?: string | null;
  rank_id?: string;
  role?: UserRole;
  cargo?: string;
  home_system?: string;
  combat_role?: string;
  bio?: string | null;
  specialties?: string[];
}

export interface UpdateCouncilUserPayload {
  rank_id?: string;
  role?: UserRole;
  cargo?: string;
  rsi_handle?: string | null;
  display_name?: string;
  expected_discord_username?: string | null;
  status?: UserStatus;
  home_system?: string;
  combat_role?: string;
  bio?: string | null;
  specialties?: string[];
}

export interface GrantAbyssalMarkPayload {
  title: string;
  reason: string;
}

export interface UpdateVerdictPayload {
  featured_in_home?: boolean;
  summary?: string;
  action_taken?: string;
  title?: string;
}

export interface SaveChroniclePayload {
  title: string;
  subtitle?: string;
  date?: string;
  dateSort?: number;
  classification?: string;
  icon?: string;
  color?: string;
  blocks: ChronicleBlock[];
}

export interface CreateObjectivePayload {
  title: string;
  description?: string;
  scope?: ObjectiveScope;
  category?: ObjectiveCategory;
  due_date?: string;
  assigned_to?: string;
  linked_mandate_id?: string;
  linked_recipe_id?: string;
}

export interface UpdateObjectivePayload {
  progress?: number;
  status?: ObjectiveStatus;
  description?: string;
  due_date?: string;
  assigned_to?: string | null;
}

export interface CreateCrusadePayload {
  title: string;
  description?: string;
  briefing?: string;
  operation_date: string;
  location: string;
  ships_required?: string[];
  max_brothers?: number;
}

export interface CreatePollOptionPayload {
  label: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface CreatePollPayload {
  title: string;
  description?: string;
  poll_type: PollType;
  closes_at: string;
  min_rank_level?: number;
  options: Array<string | CreatePollOptionPayload>;
}

export interface AuditLogsQueryParams {
  action_type?: string;
  actor_id?: string;
  target_user_id?: string;
  limit?: number;
}

export interface CouncilAuditLogsResponse {
  logs: CouncilAuditLog[];
  total?: number;
}
