// Faction-specific rules for Warhammer 40k 10th edition.
// TODO: When adding new factions, add their faction rules here following the same pattern.

export interface FactionRule {
  id: string;
  name: string;
  faction: string;
  description: string;
  trigger: "command_phase" | "shooting_phase" | "fight_phase" | "end_of_phase" | "passive" | "once_per_game";
}

export const FACTION_RULES: FactionRule[] = [
  // ─── SPACE MARINES ────────────────────────────────────────────────
  {
    id: "sm-oath-of-moment",
    name: "Oath of Moment",
    faction: "Space Marines",
    description:
      "At the start of your Command Phase, select one enemy unit. Until the start of your next Command Phase, " +
      "Space Marine units can re-roll hit rolls and wound rolls of 1 against that unit.",
    trigger: "command_phase",
  },

  // ─── DARK ANGELS ──────────────────────────────────────────────────
  {
    id: "da-grim-resolve",
    name: "Grim Resolve",
    faction: "Dark Angels",
    description:
      "Dark Angels units never have to take Battle-shock tests while within 6\" of another Dark Angels unit.",
    trigger: "passive",
  },
  {
    id: "da-inner-circle",
    name: "Inner Circle",
    faction: "Dark Angels",
    description:
      "DEATHWING and RAVENWING units ignore the penalty to their hit rolls for moving and shooting Heavy weapons.",
    trigger: "passive",
  },

  // ─── TYRANIDS ─────────────────────────────────────────────────────
  {
    id: "tyr-shadow-in-the-warp",
    name: "Shadow in the Warp",
    faction: "Tyranids",
    description:
      "Enemy units within 12\" of any Tyranid SYNAPSE unit subtract 1 from their Leadership characteristic " +
      "(minimum 1) for the purpose of Battle-shock tests.",
    trigger: "passive",
  },
  {
    id: "tyr-synaptic-imperative",
    name: "Synaptic Imperative",
    faction: "Tyranids",
    description:
      "At the start of your Command Phase, if you have a SYNAPSE unit on the battlefield, choose one: " +
      '"Instinctive Rampage" (+1 to Advance/Charge rolls), ' +
      '"Synaptic Channelling" (PSYKER units may attempt one additional psychic action), or ' +
      '"Perfect Synchrony" (re-roll one hit roll for a CORE unit once per phase).',
    trigger: "command_phase",
  },

  // ─── NECRONS ──────────────────────────────────────────────────────
  {
    id: "nec-reanimation-protocols",
    name: "Reanimation Protocols",
    faction: "Necrons",
    description:
      "At the end of each phase, for each Necron unit that had models destroyed this phase, roll one D6 for each " +
      "destroyed model. On a 5+, that model is returned (restore 1 wound to the unit's wound counter, up to max).",
    trigger: "end_of_phase",
  },
];

// Helper — get all rules for a given faction name
export function getFactionRules(factionName: string): FactionRule[] {
  const norm = factionName.toLowerCase();
  if (norm.includes("dark angels")) return FACTION_RULES.filter((r) => r.faction === "Dark Angels");
  if (norm.includes("space marine") || norm.includes("adeptus astartes"))
    return FACTION_RULES.filter((r) => r.faction === "Space Marines");
  if (norm.includes("tyranid")) return FACTION_RULES.filter((r) => r.faction === "Tyranids");
  if (norm.includes("necron")) return FACTION_RULES.filter((r) => r.faction === "Necrons");
  return [];
}
