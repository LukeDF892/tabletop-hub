export interface WeaponProfile {
  name: string;
  range: string; // "Melee" or distance like "24\""
  attacks: string; // can be "D6", "2D6+4", etc.
  skill: string; // Ballistic/Weapon skill e.g. "3+" or "4+"
  strength: number;
  ap: number; // 0 = no AP, -1 = AP-1, etc.
  damage: string; // "1", "D3", "2D6", etc.
  abilities: string[];
}

export interface Unit {
  id: string;
  name: string;
  faction: string;
  subfaction?: string;
  keywords: string[];
  factionKeywords: string[];
  stats: {
    movement: string;
    toughness: number;
    save: string;
    wounds: number;
    leadership: string;
    oc: number; // Objective Control
  };
  weapons: WeaponProfile[];
  abilities: { name: string; description: string }[];
  specialRules?: string[];
  points: number;
  baseSize?: string;
  models?: number; // models per base cost
  maxModels?: number;
  isCharacter?: boolean;
  isEpicHero?: boolean;
  isLegendary?: boolean;
  invulnSave?: string;
  feelNoPain?: string;
  damagedProfile?: { wounds: number; description: string };
}

export interface Stratagem {
  name: string;
  cost: number; // CP cost
  phase: string;
  when: string;
  target: string;
  effect: string;
  restrictions?: string;
  detachment?: string; // which detachment this belongs to, or "core" for universal
}

export interface Enhancement {
  name: string;
  points: number;
  description: string;
  exclusions?: string;
}

export interface Detachment {
  id: string;
  name: string;
  faction: string;
  subfaction?: string;
  rule: { name: string; description: string };
  stratagems: Stratagem[];
  enhancements: Enhancement[];
}

export interface Faction {
  id: string;
  name: string;
  color: string;
  secondaryColor?: string;
  lore: string;
  playstyle: string;
  subfactions?: SubFaction[];
  detachments: Detachment[];
  units: Unit[];
}

export interface SubFaction {
  id: string;
  name: string;
  parentFaction: string;
  color: string;
  lore: string;
  inheritUnits: boolean; // if true, also shows parent faction units
  additionalUnits?: string[]; // unit IDs unique to this subfaction
  detachments: Detachment[];
}

export const GAME_SIZES = [
  { points: 500, name: "Combat Patrol", description: "Small skirmish format" },
  { points: 1000, name: "Incursion", description: "Mid-size engagement" },
  { points: 2000, name: "Strike Force", description: "Standard competitive" },
  { points: 3000, name: "Onslaught", description: "Grand battle" },
] as const;

export type GameSize = (typeof GAME_SIZES)[number];
