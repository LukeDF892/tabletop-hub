export type GameSystem = "wh40k" | "age_of_sigmar";

export type GrandAlliance = "order" | "chaos" | "death" | "destruction";

export interface WarhammerFaction {
  id: string;
  name: string;
  game_system: GameSystem;
  subfaction_of?: string;
  grand_alliance?: GrandAlliance;
  lore?: string;
  color_primary?: string;
  color_secondary?: string;
}

export interface Weapon {
  name: string;
  range: string;
  attacks: string;
  skill: string;
  strength: string;
  ap: string;
  damage: string;
  abilities?: string[];
  type?: "ranged" | "melee";
}

export interface Ability {
  name: string;
  description: string;
  phase?: string;
  type?: "passive" | "active" | "command" | "stratagem";
}

export interface WargearOption {
  description: string;
  replaces?: string;
  options: string[];
}

export interface WarhammerUnit {
  id: string;
  faction_id: string;
  game_system: GameSystem;
  name: string;
  unit_type: UnitType;
  points_cost: number;
  unit_composition?: string;
  base_size?: string;
  edition?: string;
  // 40k stats
  movement_40k?: string;
  toughness_40k?: number;
  save_40k?: string;
  wounds_40k?: number;
  leadership_40k?: number;
  objective_control_40k?: number;
  invuln_save?: string;
  // AoS stats
  move_aos?: string;
  wounds_aos?: number;
  save_aos?: string;
  bravery_aos?: number;
  // Complex data
  weapons: Weapon[];
  abilities: Ability[];
  keywords: string[];
  special_rules: string[];
  wargear_options: WargearOption[];
}

export type UnitType =
  | "infantry"
  | "cavalry"
  | "vehicle"
  | "monster"
  | "hero"
  | "battleline"
  | "artillery"
  | "beast"
  | "swarm"
  | "transport"
  | "titan"
  | "fortification";

export interface ArmyUnit {
  unit_id: string;
  name: string;
  points_cost: number;
  model_count: number;
  selected_wargear: string[];
  notes?: string;
}

export interface ArmyList {
  id: string;
  name: string;
  game_system: GameSystem;
  faction_id: string;
  faction_name: string;
  points_limit: number;
  total_points: number;
  units: ArmyUnit[];
}
