export interface WeaponProfile {
  name: string;
  type: string; // "Melee" | "Ranged" | "Pistol" | "Heavy" | "Assault" | "Rapid Fire"
  range?: string;
  attacks: string;
  skill: string; // BS or WS
  strength: string;
  ap: string;
  damage: string;
  keywords?: string[];
}

export interface UnitStats {
  movement: string;
  toughness: number;
  save: string; // "3+" or "3+/4++" etc.
  wounds: number;
  leadership: string;
  oc: number;
}

export interface Ability {
  name: string;
  description: string;
  type?: "Core" | "Faction" | "Unit" | "Leader" | "Wargear";
}

export interface WargearOption {
  description: string;
}

export interface WeaponOption {
  replaces: string;          // name of the weapon being replaced
  options: WeaponProfile[];  // available alternatives
}

export interface Unit {
  id: string;
  name: string;
  role: "Character" | "Battleline" | "Infantry" | "Mounted" | "Vehicle" | "Monster" | "Aircraft" | "Titanic" | "Beast" | "Swarm";
  category: "HQ" | "Battleline" | "Elites" | "Fast Attack" | "Heavy Support" | "Dedicated Transport" | "Lord of War" | "Fortification";
  stats: UnitStats;
  models: { min: number; max: number };
  points: number;
  weapons: WeaponProfile[];
  abilities: Ability[];
  keywords: string[];
  factionKeywords: string[];
  wargearOptions?: WargearOption[];
  weaponOptions?: WeaponOption[];  // swappable weapon loadouts
  isEpicHero?: boolean;
  isTitanic?: boolean;
  chapterKeyword?: string;   // e.g. 'ULTRAMARINES', 'DARK_ANGELS' — restricts unit to that chapter only
  canFly?: boolean;
  canDeepStrike?: boolean;
  canLeadUnits?: string[];   // unit IDs this character can lead
  canBeLeadBy?: string[];    // character IDs that can lead this unit
  pointsPerModel?: number;   // when set, cost = pointsPerModel × modelCount (overrides flat points)
  teleportHomer?: boolean;   // Ravenwing units that can deploy Teleport Homers
  baseSizeMm?: number;       // official GW base diameter in mm (e.g. 32, 40, 60, 100)
}

export interface Stratagem {
  name: string;
  cost: number; // in CP
  phase: string;
  description: string;
}

export interface Enhancement {
  name: string;
  points: number;
  description: string;
  restriction?: string;
}

export interface Detachment {
  name: string;
  rule: { name: string; description: string };
  stratagems: Stratagem[];
  enhancements: Enhancement[];
}

export interface Faction {
  id: string;
  name: string;
  shortName: string;
  description: string;
  accentColor: string;
  units: Unit[];
  detachments: Detachment[];
}
