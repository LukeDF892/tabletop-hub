import type { Faction, Unit } from "./types";

const units: Unit[] = [
  // ==================== HIVE TYRANT ====================
  {
    id: "hive-tyrant",
    name: "Hive Tyrant",
    faction: "tyranids",
    keywords: ["Monster", "Character", "Psyker", "Synapse", "Hive Tyrant"],
    factionKeywords: ["Tyranids"],
    stats: { movement: "8\"", toughness: 9, save: "2+", wounds: 10, leadership: "6+", oc: 3 },
    weapons: [
      {
        name: "Monstrous Bonesword & Lashwhip",
        range: "Melee", attacks: "6", skill: "2+", strength: 10, ap: -2, damage: "3",
        abilities: ["Anti-Infantry 4+"],
      },
      {
        name: "Monstrous Rending Claws",
        range: "Melee", attacks: "5", skill: "2+", strength: 12, ap: -3, damage: "2",
        abilities: ["Anti-Monster 4+", "Anti-Vehicle 4+"],
      },
      {
        name: "Bio-cannons (stranglethorn)",
        range: "36\"", attacks: "D6+3", skill: "3+", strength: 8, ap: -2, damage: "2",
        abilities: ["Blast", "Devastating Wounds"],
      },
      {
        name: "Bio-cannons (venom cannon)",
        range: "36\"", attacks: "D6", skill: "3+", strength: 9, ap: -2, damage: "3",
        abilities: ["Blast"],
      },
    ],
    abilities: [
      { name: "Shadow in the Warp", description: "While this unit is on the battlefield, subtract 1 from Psychic tests taken for enemy units." },
      { name: "Synaptic Nexus", description: "At the start of your Command phase, if this unit is on the battlefield, it regains up to D3 lost wounds." },
      { name: "Invasive Bioprocesses", description: "Once per battle, at the end of your opponent's turn, if this unit did not move, shoot or fight that turn, it can perform a Heroic Intervention as if it were your turn." },
      { name: "Will of the Hive Mind", description: "At the start of your Command phase, you can select one friendly Tyranids unit within 18\" of this unit. That unit gains the Leader benefit until the start of your next Command phase." },
    ],
    invulnSave: "4+",
    damagedProfile: { wounds: 4, description: "While this model has 1–4 wounds remaining, subtract 2 from its Attacks characteristic and subtract 2 from its Move characteristic." },
    points: 215,
    isCharacter: true,
    baseSize: "105mm oval",
    models: 1,
  },

  // ==================== SWARMLORD ====================
  {
    id: "swarmlord",
    name: "The Swarmlord",
    faction: "tyranids",
    keywords: ["Monster", "Character", "Epic Hero", "Psyker", "Synapse", "Hive Tyrant", "The Swarmlord"],
    factionKeywords: ["Tyranids"],
    stats: { movement: "8\"", toughness: 10, save: "2+", wounds: 13, leadership: "5+", oc: 3 },
    weapons: [
      {
        name: "Bone Sabres",
        range: "Melee", attacks: "8", skill: "2+", strength: 14, ap: -4, damage: "3",
        abilities: ["Devastating Wounds", "Twin-linked"],
      },
    ],
    abilities: [
      { name: "Shadow in the Warp", description: "While this unit is on the battlefield, subtract 1 from Psychic tests taken for enemy units." },
      { name: "Synaptic Nexus", description: "At the start of your Command phase, if this unit is on the battlefield, it regains up to D3 lost wounds." },
      { name: "Hive Mind's Will", description: "At the start of your Movement phase, select up to 2 friendly Tyranids units within 24\". Those units can be targeted by Stratagems even if they have already been targeted by a Stratagem this phase." },
      { name: "Alien Cunning", description: "Once per battle, at the start of the enemy Movement phase, The Swarmlord can use this ability. Until the end of the phase, the Swarmlord is treated as if it has the Scouts 6\" ability." },
      { name: "Domination", description: "Once per battle, when an enemy unit fails a Battle-shock test, the Swarmlord can force that unit to immediately move D6\" directly towards the nearest enemy model, ignoring Engagement Ranges." },
    ],
    invulnSave: "4+",
    damagedProfile: { wounds: 5, description: "While this model has 1–5 wounds remaining, subtract 2 from its Attacks characteristic." },
    points: 310,
    isCharacter: true,
    isEpicHero: true,
    baseSize: "105mm oval",
    models: 1,
  },

  // ==================== WINGED HIVE TYRANT ====================
  {
    id: "winged-hive-tyrant",
    name: "Winged Hive Tyrant",
    faction: "tyranids",
    keywords: ["Monster", "Character", "Psyker", "Synapse", "Fly", "Hive Tyrant"],
    factionKeywords: ["Tyranids"],
    stats: { movement: "12\"", toughness: 9, save: "2+", wounds: 10, leadership: "6+", oc: 3 },
    weapons: [
      {
        name: "Monstrous Bonesword & Lashwhip",
        range: "Melee", attacks: "6", skill: "2+", strength: 10, ap: -2, damage: "3",
        abilities: ["Anti-Infantry 4+"],
      },
      {
        name: "Monstrous Rending Claws",
        range: "Melee", attacks: "5", skill: "2+", strength: 12, ap: -3, damage: "2",
        abilities: ["Anti-Monster 4+"],
      },
      {
        name: "Stranglethorn Cannon",
        range: "36\"", attacks: "D6+3", skill: "3+", strength: 8, ap: -2, damage: "2",
        abilities: ["Blast", "Devastating Wounds"],
      },
    ],
    abilities: [
      { name: "Shadow in the Warp", description: "While this unit is on the battlefield, subtract 1 from Psychic tests taken for enemy units." },
      { name: "Synaptic Nexus", description: "At the start of your Command phase, if this unit is on the battlefield, it regains up to D3 lost wounds." },
      { name: "Death From Above", description: "At the end of your opponent's Movement phase, this unit can make a Normal move of up to 6\" if it is more than 9\" from all enemy units." },
    ],
    invulnSave: "4+",
    damagedProfile: { wounds: 4, description: "While this model has 1–4 wounds remaining, subtract 2 from its Attacks characteristic and subtract 4 from its Move characteristic." },
    points: 210,
    isCharacter: true,
    baseSize: "105mm oval",
    models: 1,
  },

  // ==================== CARNIFEX ====================
  {
    id: "carnifex",
    name: "Carnifex",
    faction: "tyranids",
    keywords: ["Monster", "Carnifex"],
    factionKeywords: ["Tyranids"],
    stats: { movement: "7\"", toughness: 9, save: "2+", wounds: 8, leadership: "8+", oc: 3 },
    weapons: [
      {
        name: "Monstrous Crushing Claws",
        range: "Melee", attacks: "4", skill: "4+", strength: 14, ap: -3, damage: "3",
        abilities: ["Anti-Vehicle 4+", "Anti-Monster 4+"],
      },
      {
        name: "Monstrous Scything Talons",
        range: "Melee", attacks: "5", skill: "4+", strength: 8, ap: -2, damage: "2",
        abilities: ["Twin-linked"],
      },
      {
        name: "Bio-plasma (heavy)",
        range: "18\"", attacks: "D3", skill: "4+", strength: 9, ap: -4, damage: "D3",
        abilities: ["Blast", "Hazardous"],
      },
      {
        name: "Spore cysts",
        range: "6\"", attacks: "D6+3", skill: "4+", strength: 3, ap: 0, damage: "1",
        abilities: ["Blast", "Ignores Cover"],
      },
    ],
    abilities: [
      { name: "Living Battering Ram", description: "After this unit makes a Charge move, select one enemy unit it made a Charge move against. Roll 2D6: if the result is equal to or greater than that unit's Toughness, that unit suffers D3 mortal wounds." },
      { name: "Enhanced Senses", description: "This unit does not suffer the penalty for making ranged attacks while Engaged." },
    ],
    points: 95,
    baseSize: "105mm oval",
    models: 1,
    maxModels: 3,
  },

  // ==================== SCREAMER-KILLER ====================
  {
    id: "screamer-killer",
    name: "Screamer-Killer",
    faction: "tyranids",
    keywords: ["Monster", "Carnifex", "Screamer-Killer"],
    factionKeywords: ["Tyranids"],
    stats: { movement: "8\"", toughness: 10, save: "2+", wounds: 9, leadership: "8+", oc: 3 },
    weapons: [
      {
        name: "Bio-plasmic Scream",
        range: "18\"", attacks: "6", skill: "4+", strength: 7, ap: -2, damage: "1",
        abilities: ["Torrent"],
      },
      {
        name: "Monstrous Scything Talons",
        range: "Melee", attacks: "5", skill: "3+", strength: 10, ap: -2, damage: "2",
        abilities: ["Twin-linked"],
      },
    ],
    abilities: [
      { name: "Terrifying Screech", description: "Each time this unit makes a Charge move, each enemy unit within 3\" of this unit at the end of that Charge move must take a Battle-shock test." },
      { name: "Living Battering Ram", description: "After this unit makes a Charge move, select one enemy unit it made a Charge move against. Roll 2D6: if the result is equal to or greater than that unit's Toughness, that unit suffers D3 mortal wounds." },
    ],
    points: 115,
    baseSize: "105mm oval",
    models: 1,
  },

  // ==================== TYRANNOFEX ====================
  {
    id: "tyrannofex",
    name: "Tyrannofex",
    faction: "tyranids",
    keywords: ["Monster", "Tyrannofex"],
    factionKeywords: ["Tyranids"],
    stats: { movement: "6\"", toughness: 11, save: "2+", wounds: 16, leadership: "8+", oc: 4 },
    weapons: [
      {
        name: "Acid Spray",
        range: "12\"", attacks: "2D6", skill: "4+", strength: 6, ap: -1, damage: "1",
        abilities: ["Torrent", "Anti-Infantry 4+"],
      },
      {
        name: "Rupture Cannon",
        range: "48\"", attacks: "3", skill: "4+", strength: 16, ap: -4, damage: "D6+2",
        abilities: ["Devastating Wounds"],
      },
      {
        name: "Fleshborer Hive",
        range: "18\"", attacks: "D6+6", skill: "4+", strength: 5, ap: 0, damage: "1",
        abilities: ["Blast"],
      },
      {
        name: "Stinger Salvo (improved)",
        range: "24\"", attacks: "6", skill: "4+", strength: 5, ap: -1, damage: "1",
        abilities: ["Sustained Hits 2"],
      },
    ],
    abilities: [
      { name: "Acid Blood", description: "Each time a melee attack is allocated to this model and that attack has an Armour Penetration characteristic of -1 or less, the attacker's unit suffers 1 mortal wound after all attacks have been resolved." },
    ],
    damagedProfile: { wounds: 6, description: "While this model has 1–6 wounds remaining, subtract 1 from its Ballistic Skill characteristic." },
    points: 195,
    baseSize: "120mm round",
    models: 1,
  },

  // ==================== TERVIGON ====================
  {
    id: "tervigon",
    name: "Tervigon",
    faction: "tyranids",
    keywords: ["Monster", "Character", "Synapse", "Tervigon"],
    factionKeywords: ["Tyranids"],
    stats: { movement: "7\"", toughness: 11, save: "2+", wounds: 14, leadership: "6+", oc: 3 },
    weapons: [
      {
        name: "Massive Crushing Claws",
        range: "Melee", attacks: "4", skill: "4+", strength: 16, ap: -3, damage: "D6+1",
        abilities: ["Anti-Vehicle 4+", "Anti-Monster 4+"],
      },
      {
        name: "Stinger Salvoes",
        range: "24\"", attacks: "D6+6", skill: "4+", strength: 5, ap: -1, damage: "1",
        abilities: ["Sustained Hits 1"],
      },
    ],
    abilities: [
      { name: "Brood Progenitor", description: "Each time a friendly Termagants unit within 12\" of this unit is destroyed, you can set up a new unit of 10 Termagants in Reinforcements." },
      { name: "Spawn Termagants", description: "At the start of your Movement phase, roll 3D6. For each result of 6, add one Termagant model to a friendly Termagants unit within 6\" of this model, to a maximum of the unit's starting strength." },
      { name: "Living Fortress", description: "While this unit is on the battlefield, each time an enemy unit ends a Normal, Advance, or Fall Back move within 9\" of this unit, that unit suffers D3 mortal wounds." },
    ],
    isCharacter: true,
    damagedProfile: { wounds: 5, description: "While this model has 1–5 wounds remaining, its Spawn Termagants ability is lost and subtract 2 from this model's Attacks." },
    points: 175,
    baseSize: "120mm round",
    models: 1,
  },

  // ==================== HARUSPEX ====================
  {
    id: "haruspex",
    name: "Haruspex",
    faction: "tyranids",
    keywords: ["Monster", "Haruspex"],
    factionKeywords: ["Tyranids"],
    stats: { movement: "8\"", toughness: 10, save: "3+", wounds: 12, leadership: "8+", oc: 4 },
    weapons: [
      {
        name: "Grasping Tongue",
        range: "12\"", attacks: "1", skill: "4+", strength: 8, ap: -3, damage: "D6",
        abilities: ["Precision"],
      },
      {
        name: "Monstrous Acid Maw",
        range: "Melee", attacks: "3", skill: "4+", strength: 14, ap: -4, damage: "D6",
        abilities: ["Anti-Monster 4+", "Anti-Vehicle 4+"],
      },
      {
        name: "Ravenous Maw",
        range: "Melee", attacks: "5", skill: "4+", strength: 6, ap: -1, damage: "1",
        abilities: ["Lethal Hits"],
      },
    ],
    abilities: [
      { name: "Murderous Hunger", description: "Each time this unit destroys an enemy model, it regains 1 lost wound, to a maximum of 3 wounds regained per phase." },
    ],
    points: 120,
    baseSize: "105mm oval",
    models: 1,
  },

  // ==================== EXOCRINE ====================
  {
    id: "exocrine",
    name: "Exocrine",
    faction: "tyranids",
    keywords: ["Monster", "Exocrine"],
    factionKeywords: ["Tyranids"],
    stats: { movement: "6\"", toughness: 10, save: "2+", wounds: 12, leadership: "8+", oc: 3 },
    weapons: [
      {
        name: "Bio-plasmic Cannon",
        range: "36\"", attacks: "6", skill: "4+", strength: 9, ap: -3, damage: "3",
        abilities: ["Blast", "Lethal Hits"],
      },
      {
        name: "Powerful Limbs",
        range: "Melee", attacks: "4", skill: "4+", strength: 8, ap: -1, damage: "2",
        abilities: [],
      },
    ],
    abilities: [
      { name: "Symbiotic Targeting", description: "Once per turn, when this unit is selected to shoot, if it has not moved this phase, you can re-roll all Hit rolls for its Bio-plasmic Cannon." },
    ],
    points: 165,
    baseSize: "120mm round",
    models: 1,
  },

  // ==================== MALECEPTOR ====================
  {
    id: "maleceptor",
    name: "Maleceptor",
    faction: "tyranids",
    keywords: ["Monster", "Psyker", "Synapse", "Maleceptor"],
    factionKeywords: ["Tyranids"],
    stats: { movement: "8\"", toughness: 10, save: "3+", wounds: 10, leadership: "7+", oc: 3 },
    weapons: [
      {
        name: "Massive Scything Talons",
        range: "Melee", attacks: "5", skill: "4+", strength: 10, ap: -2, damage: "2",
        abilities: ["Twin-linked"],
      },
      {
        name: "Psychic Overload",
        range: "18\"", attacks: "4", skill: "4+", strength: 8, ap: -3, damage: "D3",
        abilities: ["Psychic", "Ignores Cover"],
      },
    ],
    abilities: [
      { name: "Shadow in the Warp", description: "While this unit is on the battlefield, subtract 1 from Psychic tests taken for enemy units." },
      { name: "Synaptic Node", description: "At the start of your Command phase, you can select one friendly Tyranids unit within 12\". Until the start of your next Command phase, that unit is treated as being within Synapse range regardless of distance." },
      { name: "Psychic Feedback", description: "Each time an enemy Psyker unit within 18\" of this unit takes a Psychic test and the test is passed, that unit suffers D3 mortal wounds after the effect is resolved." },
    ],
    invulnSave: "5+",
    points: 155,
    baseSize: "105mm oval",
    models: 1,
  },

  // ==================== PSYCHOPHAGE ====================
  {
    id: "psychophage",
    name: "Psychophage",
    faction: "tyranids",
    keywords: ["Monster", "Psyker", "Psychophage"],
    factionKeywords: ["Tyranids"],
    stats: { movement: "9\"", toughness: 9, save: "3+", wounds: 10, leadership: "8+", oc: 3 },
    weapons: [
      {
        name: "Psychic Howl",
        range: "18\"", attacks: "D6+2", skill: "4+", strength: 6, ap: -1, damage: "1",
        abilities: ["Psychic", "Torrent"],
      },
      {
        name: "Bio-flail",
        range: "Melee", attacks: "D6+2", skill: "4+", strength: 8, ap: -2, damage: "2",
        abilities: ["Anti-Psyker 4+"],
      },
    ],
    abilities: [
      { name: "Soul Hunger", description: "Each time this unit destroys an enemy Psyker unit, regain D3 lost wounds. While this unit has maximum wounds, it has an additional +1 to its Strength and Attacks characteristics." },
      { name: "Predatory Instincts", description: "Once per turn, after this unit makes a Normal, Advance, or Charge move, select one enemy unit within 6\". That unit must take a Battle-shock test." },
    ],
    points: 140,
    baseSize: "105mm oval",
    models: 1,
  },

  // ==================== NORN EMISSARY ====================
  {
    id: "norn-emissary",
    name: "Norn Emissary",
    faction: "tyranids",
    keywords: ["Monster", "Character", "Synapse", "Norn Emissary"],
    factionKeywords: ["Tyranids"],
    stats: { movement: "8\"", toughness: 10, save: "2+", wounds: 14, leadership: "6+", oc: 4 },
    weapons: [
      {
        name: "Synaptic Claws and Talons",
        range: "Melee", attacks: "8", skill: "2+", strength: 12, ap: -2, damage: "2",
        abilities: ["Devastating Wounds", "Sustained Hits 1"],
      },
    ],
    abilities: [
      { name: "Edict of the Norn Queen", description: "At the start of your Command phase, select one friendly Tyranids unit within 12\". That unit gains a bonus to one of: +1 Movement, +1 to Hit rolls in Shooting, +1 to Hit rolls in Melee, or regain D3 wounds. Each bonus can only be selected once per turn." },
      { name: "Indomitable Will", description: "Models in this unit cannot lose more than 4 wounds due to a single attack (all excess damage is ignored)." },
      { name: "Regeneration", description: "At the start of your Command phase, this model regains up to D3 lost wounds." },
    ],
    invulnSave: "4+",
    feelNoPain: "6+",
    isCharacter: true,
    damagedProfile: { wounds: 5, description: "While this model has 1–5 wounds remaining, subtract 1 from its Attacks characteristic." },
    points: 240,
    baseSize: "120mm round",
    models: 1,
  },

  // ==================== NORN ASSIMILATOR ====================
  {
    id: "norn-assimilator",
    name: "Norn Assimilator",
    faction: "tyranids",
    keywords: ["Monster", "Character", "Synapse", "Norn Assimilator"],
    factionKeywords: ["Tyranids"],
    stats: { movement: "8\"", toughness: 11, save: "2+", wounds: 14, leadership: "6+", oc: 4 },
    weapons: [
      {
        name: "Predator Talons",
        range: "Melee", attacks: "4", skill: "2+", strength: 14, ap: -4, damage: "D6+1",
        abilities: ["Anti-Monster 4+", "Anti-Vehicle 4+"],
      },
      {
        name: "Shard Launcher",
        range: "36\"", attacks: "D6+3", skill: "3+", strength: 7, ap: -2, damage: "2",
        abilities: ["Blast"],
      },
    ],
    abilities: [
      { name: "Assimilate Bioforms", description: "Each time this unit destroys an enemy Monster or Vehicle unit, it gains +1 Toughness and +2 Wounds until the end of the battle (max +3T, +6W)." },
      { name: "Indomitable Will", description: "Models in this unit cannot lose more than 4 wounds due to a single attack." },
      { name: "Regeneration", description: "At the start of your Command phase, this model regains up to D3 lost wounds." },
    ],
    invulnSave: "4+",
    feelNoPain: "6+",
    isCharacter: true,
    damagedProfile: { wounds: 5, description: "While this model has 1–5 wounds remaining, subtract 1 from its Attacks characteristic." },
    points: 270,
    baseSize: "120mm round",
    models: 1,
  },

  // ==================== NEUROLICTOR ====================
  {
    id: "neurolictor",
    name: "Neurolictor",
    faction: "tyranids",
    keywords: ["Infantry", "Character", "Synapse", "Neurolictor"],
    factionKeywords: ["Tyranids"],
    stats: { movement: "8\"", toughness: 5, save: "3+", wounds: 4, leadership: "6+", oc: 1 },
    weapons: [
      {
        name: "Prehensile Appendages",
        range: "Melee", attacks: "4", skill: "2+", strength: 6, ap: -2, damage: "1",
        abilities: ["Lethal Hits", "Precision"],
      },
    ],
    abilities: [
      { name: "Synaptic Whispers", description: "At the start of the enemy Command phase, if any enemy units are within 12\" of this unit, select one of those units. That unit cannot use any Command Reroll abilities this phase and must subtract 1 from its Leadership characteristic until the start of your next Command phase." },
      { name: "Lightning Reflexes", description: "This unit has a 4+ invulnerable save. Each time an attack is made against this unit, if the attacker is more than 12\" away, the Hit roll suffers -1." },
      { name: "Perfect Hunter", description: "Each time this unit makes an attack against a Character unit, add 1 to the Hit roll." },
    ],
    invulnSave: "4+",
    isCharacter: true,
    points: 75,
    baseSize: "50mm round",
    models: 1,
  },

  // ==================== TERMAGANTS ====================
  {
    id: "termagants",
    name: "Termagants",
    faction: "tyranids",
    keywords: ["Infantry", "Battleline", "Termagants"],
    factionKeywords: ["Tyranids"],
    stats: { movement: "6\"", toughness: 3, save: "5+", wounds: 1, leadership: "8+", oc: 2 },
    weapons: [
      {
        name: "Fleshborer",
        range: "18\"", attacks: "1", skill: "4+", strength: 4, ap: 0, damage: "1",
        abilities: [],
      },
      {
        name: "Devourer",
        range: "18\"", attacks: "3", skill: "4+", strength: 4, ap: 0, damage: "1",
        abilities: [],
      },
      {
        name: "Spinefists",
        range: "12\"", attacks: "2", skill: "4+", strength: 3, ap: 0, damage: "1",
        abilities: ["Pistol", "Twin-linked"],
      },
    ],
    abilities: [
      { name: "Skulking Horrors", description: "At the start of your opponent's Shooting phase, if this unit is not within Engagement Range of any enemy units, it can make a Normal move of up to D6\"." },
    ],
    points: 60, // 10 models
    models: 10,
    maxModels: 20,
    baseSize: "25mm round",
  },

  // ==================== HORMAGAUNTS ====================
  {
    id: "hormagaunts",
    name: "Hormagaunts",
    faction: "tyranids",
    keywords: ["Infantry", "Battleline", "Hormagaunts"],
    factionKeywords: ["Tyranids"],
    stats: { movement: "9\"", toughness: 3, save: "5+", wounds: 1, leadership: "8+", oc: 2 },
    weapons: [
      {
        name: "Scything Talons",
        range: "Melee", attacks: "2", skill: "4+", strength: 4, ap: 0, damage: "1",
        abilities: ["Lethal Hits"],
      },
    ],
    abilities: [
      { name: "Bounding Leap", description: "This unit is eligible to declare a charge in a turn in which it Advanced." },
      { name: "Instinctive Hunting", description: "Each time this unit makes a Charge move, until the end of the turn, add 1 to the Attacks characteristic of models in this unit." },
    ],
    points: 60, // 10 models
    models: 10,
    maxModels: 20,
    baseSize: "25mm round",
  },

  // ==================== RIPPER SWARMS ====================
  {
    id: "ripper-swarms",
    name: "Ripper Swarms",
    faction: "tyranids",
    keywords: ["Swarm", "Ripper Swarms"],
    factionKeywords: ["Tyranids"],
    stats: { movement: "5\"", toughness: 3, save: "6+", wounds: 4, leadership: "8+", oc: 0 },
    weapons: [
      {
        name: "Claws, Teeth and Acid",
        range: "Melee", attacks: "5", skill: "4+", strength: 3, ap: 0, damage: "1",
        abilities: ["Anti-Infantry 4+"],
      },
    ],
    abilities: [
      { name: "Burrowing Horrors", description: "During deployment, you can set up this unit underground instead of on the battlefield. At the end of your opponent's Movement phase, you can set up this unit anywhere on the battlefield that is more than 9\" horizontally from all enemy models." },
      { name: "Voracious", description: "Each time this unit destroys an enemy Infantry model in melee, this unit regains 1 lost wound, to a maximum of 4 wounds regained per phase." },
    ],
    feelNoPain: "6+",
    points: 45, // 3 bases
    models: 3,
    maxModels: 9,
    baseSize: "40mm round",
  },

  // ==================== GARGOYLES ====================
  {
    id: "gargoyles",
    name: "Gargoyles",
    faction: "tyranids",
    keywords: ["Infantry", "Battleline", "Fly", "Gargoyles"],
    factionKeywords: ["Tyranids"],
    stats: { movement: "12\"", toughness: 3, save: "5+", wounds: 1, leadership: "8+", oc: 2 },
    weapons: [
      {
        name: "Fleshborer",
        range: "18\"", attacks: "1", skill: "4+", strength: 4, ap: 0, damage: "1",
        abilities: [],
      },
      {
        name: "Blinding Venom",
        range: "Melee", attacks: "1", skill: "4+", strength: 3, ap: 0, damage: "1",
        abilities: ["Anti-Infantry 4+"],
      },
    ],
    abilities: [
      { name: "Swooping Dive", description: "This unit is eligible to declare a charge in a turn in which it Advanced." },
      { name: "Blinding Venom", description: "Each time an enemy unit is selected to shoot, if it is within Engagement Range of this unit, subtract 1 from all Hit rolls for attacks made by that unit." },
    ],
    points: 75, // 10 models
    models: 10,
    maxModels: 20,
    baseSize: "25mm round",
  },

  // ==================== GENESTEALERS ====================
  {
    id: "genestealers",
    name: "Genestealers",
    faction: "tyranids",
    keywords: ["Infantry", "Genestealers"],
    factionKeywords: ["Tyranids"],
    stats: { movement: "8\"", toughness: 4, save: "5+", wounds: 2, leadership: "8+", oc: 1 },
    weapons: [
      {
        name: "Rending Claws",
        range: "Melee", attacks: "4", skill: "2+", strength: 5, ap: -2, damage: "1",
        abilities: ["Anti-Infantry 4+", "Lethal Hits"],
      },
    ],
    abilities: [
      { name: "Lightning Reflexes", description: "Each time an attack is made against this unit, if the attacker is more than 12\" away, the Hit roll suffers -1. This unit has a 5+ invulnerable save." },
      { name: "Unnatural Reflexes", description: "This unit has a 5+ invulnerable save." },
    ],
    invulnSave: "5+",
    points: 85, // 5 models
    models: 5,
    maxModels: 20,
    baseSize: "25mm round",
  },

  // ==================== LICTOR ====================
  {
    id: "lictor",
    name: "Lictor",
    faction: "tyranids",
    keywords: ["Infantry", "Character", "Lictor"],
    factionKeywords: ["Tyranids"],
    stats: { movement: "9\"", toughness: 5, save: "3+", wounds: 5, leadership: "8+", oc: 1 },
    weapons: [
      {
        name: "Flesh Hooks",
        range: "12\"", attacks: "4", skill: "3+", strength: 5, ap: 0, damage: "1",
        abilities: ["Assault"],
      },
      {
        name: "Raptor Talons",
        range: "Melee", attacks: "5", skill: "3+", strength: 6, ap: -2, damage: "2",
        abilities: ["Precision"],
      },
    ],
    abilities: [
      { name: "Hidden Hunter", description: "During deployment, you can set up this unit in concealment instead of on the battlefield. At the end of your opponent's Movement phase, set it up anywhere on the battlefield that is more than 9\" from all enemy units." },
      { name: "Pheromone Trail", description: "While this unit is on the battlefield, friendly Tyranids units that arrive as Reinforcements can be set up within 6\" of this unit if they are more than 3\" from all enemy units." },
    ],
    invulnSave: "5+",
    isCharacter: true,
    points: 65,
    baseSize: "40mm round",
    models: 1,
  },

  // ==================== DEATHLEAPER ====================
  {
    id: "deathleaper",
    name: "Deathleaper",
    faction: "tyranids",
    keywords: ["Infantry", "Character", "Epic Hero", "Lictor", "Deathleaper"],
    factionKeywords: ["Tyranids"],
    stats: { movement: "9\"", toughness: 5, save: "3+", wounds: 6, leadership: "8+", oc: 1 },
    weapons: [
      {
        name: "Flesh Hooks",
        range: "12\"", attacks: "4", skill: "2+", strength: 5, ap: 0, damage: "1",
        abilities: ["Assault"],
      },
      {
        name: "Raptor Talons",
        range: "Melee", attacks: "6", skill: "2+", strength: 7, ap: -2, damage: "2",
        abilities: ["Precision", "Lethal Hits"],
      },
    ],
    abilities: [
      { name: "Hidden Hunter", description: "During deployment, you can set up this unit in concealment instead of on the battlefield. At the end of your opponent's Movement phase, set it up anywhere on the battlefield that is more than 9\" from all enemy units." },
      { name: "Pheromone Trail", description: "While this unit is on the battlefield, friendly Tyranids units that arrive as Reinforcements can be set up within 6\" of this unit if they are more than 3\" from all enemy units." },
      { name: "It's After Me!", description: "At the start of the enemy Shooting phase, select one enemy Character unit within 18\" of this unit. Until the end of the phase, that unit cannot make attacks against any unit other than this unit." },
      { name: "Lightning Reflexes", description: "This unit has a 4+ invulnerable save." },
    ],
    invulnSave: "4+",
    isCharacter: true,
    isEpicHero: true,
    points: 85,
    baseSize: "40mm round",
    models: 1,
  },

  // ==================== VON RYAN'S LEAPERS ====================
  {
    id: "von-ryans-leapers",
    name: "Von Ryan's Leapers",
    faction: "tyranids",
    keywords: ["Infantry", "Von Ryan's Leapers"],
    factionKeywords: ["Tyranids"],
    stats: { movement: "9\"", toughness: 4, save: "3+", wounds: 3, leadership: "8+", oc: 1 },
    weapons: [
      {
        name: "Leaper Talons",
        range: "Melee", attacks: "4", skill: "3+", strength: 5, ap: -1, damage: "1",
        abilities: ["Anti-Infantry 4+", "Lethal Hits"],
      },
    ],
    abilities: [
      { name: "Pouncing Hunters", description: "This unit is eligible to declare a charge in a turn in which it Advanced. In addition, add 1 to Charge rolls for this unit." },
      { name: "Disappear Back Into Shadows", description: "After this unit fights, if it is not within Engagement Range of any enemy units and it is not Battle-shocked, it can make a Normal move of up to 6\"." },
    ],
    invulnSave: "5+",
    points: 70, // 3 models
    models: 3,
    maxModels: 6,
    baseSize: "40mm round",
  },

  // ==================== PARASITE OF MORTREX ====================
  {
    id: "parasite-of-mortrex",
    name: "Parasite of Mortrex",
    faction: "tyranids",
    keywords: ["Infantry", "Character", "Epic Hero", "Fly", "Parasite of Mortrex"],
    factionKeywords: ["Tyranids"],
    stats: { movement: "12\"", toughness: 5, save: "3+", wounds: 5, leadership: "8+", oc: 1 },
    weapons: [
      {
        name: "Barbed Ovipositor",
        range: "Melee", attacks: "6", skill: "3+", strength: 5, ap: -1, damage: "1",
        abilities: ["Lethal Hits", "Sustained Hits 1"],
      },
    ],
    abilities: [
      { name: "Implant Attack", description: "Each time this unit destroys an enemy Infantry model, roll one D6: on a 4+, place one Ripper Swarm Counter next to that unit. At the end of your Movement phase, for each Counter next to an enemy unit, that unit suffers 1 mortal wound. Remove all Counters at the end of your turn." },
      { name: "Death from Above", description: "During deployment, this unit can be set up in high altitude instead of on the battlefield. At the start of any of your Movement phases, set it up anywhere on the battlefield that is more than 9\" horizontally from all enemy models." },
    ],
    invulnSave: "5+",
    isCharacter: true,
    isEpicHero: true,
    points: 75,
    baseSize: "40mm round",
    models: 1,
  },

  // ==================== ZOANTHROPES ====================
  {
    id: "zoanthropes",
    name: "Zoanthropes",
    faction: "tyranids",
    keywords: ["Infantry", "Psyker", "Synapse", "Zoanthropes"],
    factionKeywords: ["Tyranids"],
    stats: { movement: "5\"", toughness: 4, save: "3+", wounds: 3, leadership: "7+", oc: 1 },
    weapons: [
      {
        name: "Warp Blast",
        range: "18\"", attacks: "1", skill: "3+", strength: 10, ap: -4, damage: "3",
        abilities: ["Psychic"],
      },
      {
        name: "Claws and Teeth",
        range: "Melee", attacks: "2", skill: "4+", strength: 4, ap: 0, damage: "1",
        abilities: [],
      },
    ],
    abilities: [
      { name: "Shadow in the Warp", description: "While this unit is on the battlefield, subtract 1 from Psychic tests taken for enemy units." },
      { name: "Warp Field", description: "This unit has a 3+ invulnerable save." },
      { name: "Synaptic Focal Point", description: "At the start of your Command phase, if this unit contains 3 or more models and is within 18\" of a friendly Synapse unit, you can give one friendly Tyranids unit within 12\" of this unit a bonus Command point." },
    ],
    invulnSave: "3+",
    points: 75, // 3 models
    models: 3,
    maxModels: 6,
    baseSize: "40mm round",
  },

  // ==================== VENOMTHROPES ====================
  {
    id: "venomthropes",
    name: "Venomthropes",
    faction: "tyranids",
    keywords: ["Infantry", "Venomthropes"],
    factionKeywords: ["Tyranids"],
    stats: { movement: "6\"", toughness: 4, save: "4+", wounds: 3, leadership: "8+", oc: 1 },
    weapons: [
      {
        name: "Toxic Lashes",
        range: "Melee", attacks: "3", skill: "4+", strength: 4, ap: 0, damage: "1",
        abilities: ["Anti-Infantry 4+"],
      },
    ],
    abilities: [
      { name: "Shrouding Spores", description: "While this unit is on the battlefield, all friendly Tyranids Infantry units within 6\" of this unit have the Stealth ability." },
    ],
    points: 60, // 3 models
    models: 3,
    maxModels: 6,
    baseSize: "40mm round",
  },

  // ==================== NEUROTHROPE ====================
  {
    id: "neurothrope",
    name: "Neurothrope",
    faction: "tyranids",
    keywords: ["Infantry", "Character", "Psyker", "Synapse", "Zoanthropes", "Neurothrope"],
    factionKeywords: ["Tyranids"],
    stats: { movement: "5\"", toughness: 4, save: "3+", wounds: 4, leadership: "7+", oc: 1 },
    weapons: [
      {
        name: "Warp Blast",
        range: "18\"", attacks: "1", skill: "3+", strength: 10, ap: -4, damage: "3",
        abilities: ["Psychic"],
      },
      {
        name: "Claws and Teeth",
        range: "Melee", attacks: "3", skill: "4+", strength: 4, ap: 0, damage: "1",
        abilities: [],
      },
    ],
    abilities: [
      { name: "Shadow in the Warp", description: "While this unit is on the battlefield, subtract 1 from Psychic tests taken for enemy units." },
      { name: "Warp Field", description: "This unit has a 3+ invulnerable save." },
      { name: "Synaptic Enhancement", description: "While this model is leading a unit, add 6\" to the range of the unit's Shadow in the Warp ability. In addition, once per battle, when this model's unit would fail a Psychic test, you can use this ability to automatically pass it instead." },
    ],
    invulnSave: "3+",
    isCharacter: true,
    points: 55,
    baseSize: "40mm round",
    models: 1,
  },

  // ==================== TYRANID WARRIORS ====================
  {
    id: "tyranid-warriors",
    name: "Tyranid Warriors",
    faction: "tyranids",
    keywords: ["Infantry", "Synapse", "Tyranid Warriors"],
    factionKeywords: ["Tyranids"],
    stats: { movement: "6\"", toughness: 5, save: "4+", wounds: 3, leadership: "7+", oc: 2 },
    weapons: [
      {
        name: "Devourer",
        range: "18\"", attacks: "3", skill: "3+", strength: 4, ap: 0, damage: "1",
        abilities: [],
      },
      {
        name: "Barbed Strangler",
        range: "24\"", attacks: "D6+2", skill: "3+", strength: 5, ap: -1, damage: "1",
        abilities: ["Blast"],
      },
      {
        name: "Venom Cannon",
        range: "24\"", attacks: "D3", skill: "3+", strength: 8, ap: -2, damage: "2",
        abilities: [],
      },
      {
        name: "Scything Talons",
        range: "Melee", attacks: "3", skill: "3+", strength: 5, ap: 0, damage: "1",
        abilities: ["Twin-linked"],
      },
      {
        name: "Boneswords",
        range: "Melee", attacks: "3", skill: "3+", strength: 6, ap: -2, damage: "2",
        abilities: [],
      },
    ],
    abilities: [
      { name: "Adrenal Surge", description: "Once per battle, at the start of your Fight phase, this unit can use this ability. Until the end of the phase, add 1 to the Attacks and Strength characteristics of models in this unit." },
    ],
    points: 75, // 3 models
    models: 3,
    maxModels: 6,
    baseSize: "40mm round",
  },

  // ==================== TYRANID PRIME ====================
  {
    id: "tyranid-prime",
    name: "Tyranid Prime",
    faction: "tyranids",
    keywords: ["Infantry", "Character", "Synapse", "Tyranid Warriors", "Tyranid Prime"],
    factionKeywords: ["Tyranids"],
    stats: { movement: "6\"", toughness: 5, save: "3+", wounds: 5, leadership: "6+", oc: 2 },
    weapons: [
      {
        name: "Bio-weapon Arsenal (Deathspitter)",
        range: "18\"", attacks: "3", skill: "2+", strength: 5, ap: -1, damage: "1",
        abilities: [],
      },
      {
        name: "Prime's Boneswords",
        range: "Melee", attacks: "5", skill: "2+", strength: 8, ap: -2, damage: "2",
        abilities: ["Devastating Wounds"],
      },
    ],
    abilities: [
      { name: "Instinctive Killer", description: "While this unit is leading a Tyranid Warriors unit, add 1 to the Attacks characteristic of models in that unit." },
      { name: "Enhanced Resilience", description: "This model has a 4+ invulnerable save." },
    ],
    invulnSave: "4+",
    isCharacter: true,
    points: 80,
    baseSize: "40mm round",
    models: 1,
  },

  // ==================== RAVENERS ====================
  {
    id: "raveners",
    name: "Raveners",
    faction: "tyranids",
    keywords: ["Infantry", "Raveners"],
    factionKeywords: ["Tyranids"],
    stats: { movement: "10\"", toughness: 5, save: "4+", wounds: 3, leadership: "8+", oc: 2 },
    weapons: [
      {
        name: "Rending Claws",
        range: "Melee", attacks: "4", skill: "3+", strength: 5, ap: -2, damage: "1",
        abilities: ["Anti-Infantry 4+"],
      },
      {
        name: "Spine Fists",
        range: "12\"", attacks: "2", skill: "3+", strength: 3, ap: 0, damage: "1",
        abilities: ["Pistol", "Twin-linked"],
      },
    ],
    abilities: [
      { name: "Burrowing Strike", description: "During deployment, set up this unit underground instead of on the battlefield. At the end of your opponent's Movement phase, set up this unit anywhere on the battlefield that is more than 9\" from all enemy units." },
      { name: "Swift Killers", description: "This unit is eligible to declare a charge in a turn in which it Advanced." },
    ],
    points: 75, // 3 models
    models: 3,
    maxModels: 6,
    baseSize: "40mm round",
  },

  // ==================== TRYGON ====================
  {
    id: "trygon",
    name: "Trygon",
    faction: "tyranids",
    keywords: ["Monster", "Trygon"],
    factionKeywords: ["Tyranids"],
    stats: { movement: "10\"", toughness: 10, save: "3+", wounds: 14, leadership: "8+", oc: 4 },
    weapons: [
      {
        name: "Biostatic Rattle",
        range: "12\"", attacks: "6", skill: "3+", strength: 5, ap: -1, damage: "1",
        abilities: ["Assault"],
      },
      {
        name: "Massive Scything Talons",
        range: "Melee", attacks: "5", skill: "3+", strength: 10, ap: -3, damage: "D3+1",
        abilities: ["Anti-Vehicle 4+", "Anti-Monster 4+"],
      },
      {
        name: "Prehensile Tail",
        range: "Melee", attacks: "1", skill: "3+", strength: 7, ap: -1, damage: "2",
        abilities: ["Precision"],
      },
    ],
    abilities: [
      { name: "Subterranean Assault", description: "During deployment, set this unit underground. At the end of your opponent's Movement phase, set it up anywhere on the battlefield more than 9\" from all enemy units. All friendly Tyranids Infantry units with the Underground ability that were set up within 6\" of where this model emerged can move D6\" towards the nearest enemy unit." },
      { name: "Death From Below", description: "The first time this unit is set up from underground this turn, each enemy unit within 9\" of where it is placed must take a Dangerous Terrain test." },
    ],
    points: 185,
    baseSize: "120mm round",
    models: 1,
  },

  // ==================== MAWLOC ====================
  {
    id: "mawloc",
    name: "Mawloc",
    faction: "tyranids",
    keywords: ["Monster", "Trygon", "Mawloc"],
    factionKeywords: ["Tyranids"],
    stats: { movement: "10\"", toughness: 10, save: "3+", wounds: 14, leadership: "8+", oc: 4 },
    weapons: [
      {
        name: "Distensible Maw",
        range: "Melee", attacks: "3", skill: "3+", strength: 14, ap: -4, damage: "D6",
        abilities: ["Anti-Monster 4+", "Anti-Vehicle 4+"],
      },
      {
        name: "Prehensile Tail",
        range: "Melee", attacks: "2", skill: "3+", strength: 7, ap: -1, damage: "2",
        abilities: ["Precision"],
      },
    ],
    abilities: [
      { name: "Terror From the Deep", description: "Each time this unit burrows (goes underground), select one enemy unit that was within 9\" of this unit when it burrowed. That unit suffers D6+2 mortal wounds." },
      { name: "Subterranean Assault", description: "During deployment, set this unit underground. At the end of your opponent's Movement phase, set it up anywhere more than 9\" from all enemy units." },
      { name: "Ambush Predator", description: "Once per battle, when this unit is set up from underground, it can immediately make a Normal move of up to 6\"." },
    ],
    points: 175,
    baseSize: "120mm round",
    models: 1,
  },

  // ==================== TOXICRENE ====================
  {
    id: "toxicrene",
    name: "Toxicrene",
    faction: "tyranids",
    keywords: ["Monster", "Toxicrene"],
    factionKeywords: ["Tyranids"],
    stats: { movement: "8\"", toughness: 10, save: "3+", wounds: 12, leadership: "8+", oc: 3 },
    weapons: [
      {
        name: "Massive Toxic Lashes",
        range: "Melee", attacks: "10", skill: "4+", strength: 6, ap: -1, damage: "1",
        abilities: ["Anti-Infantry 4+", "Sustained Hits 1"],
      },
      {
        name: "Haemotoxin Sacs",
        range: "Melee", attacks: "3", skill: "4+", strength: 9, ap: -2, damage: "2",
        abilities: ["Anti-Monster 4+", "Anti-Vehicle 4+"],
      },
    ],
    abilities: [
      { name: "Toxic Miasma", description: "At the end of your Fight phase, each enemy unit within 3\" of this unit suffers D3 mortal wounds on a 2+." },
      { name: "Envenomed Weapons", description: "Each time this unit makes a Melee attack, an unmodified Hit roll of 6 causes that attack to automatically wound the target." },
    ],
    points: 155,
    baseSize: "120mm round",
    models: 1,
  },

  // ==================== MUCOLID SPORES ====================
  {
    id: "mucolid-spores",
    name: "Mucolid Spores",
    faction: "tyranids",
    keywords: ["Infantry", "Fly", "Mucolid Spores"],
    factionKeywords: ["Tyranids"],
    stats: { movement: "5\"", toughness: 3, save: "6+", wounds: 3, leadership: "8+", oc: 0 },
    weapons: [
      {
        name: "Spore Mine Blast",
        range: "Melee", attacks: "1", skill: "4+", strength: 5, ap: -2, damage: "D3",
        abilities: ["Devastating Wounds"],
      },
    ],
    abilities: [
      { name: "Floating Death", description: "This unit cannot make Normal moves, Advance moves, or Fall Back moves. Instead, at the start of your Movement phase, you can move this unit up to 5\" in any direction." },
      { name: "Death From Above", description: "During deployment, this unit can be set up in high altitude instead of on the battlefield. At the start of any of your Movement phases, set it up anywhere more than 9\" from all enemy models." },
      { name: "Detonation", description: "Each time this unit is destroyed, before removing it, roll one D6 for each enemy unit within 3\": on a 2+, that unit suffers D3 mortal wounds." },
    ],
    points: 30, // 1 model
    models: 1,
    maxModels: 3,
    baseSize: "40mm round",
  },

  // ==================== SPORE MINES ====================
  {
    id: "spore-mines",
    name: "Spore Mines",
    faction: "tyranids",
    keywords: ["Swarm", "Fly", "Spore Mines"],
    factionKeywords: ["Tyranids"],
    stats: { movement: "5\"", toughness: 2, save: "6+", wounds: 1, leadership: "8+", oc: 0 },
    weapons: [
      {
        name: "Spore Mine Blast",
        range: "Melee", attacks: "1", skill: "4+", strength: 4, ap: -1, damage: "1",
        abilities: ["Devastating Wounds"],
      },
    ],
    abilities: [
      { name: "Floating Death", description: "This unit cannot make Normal moves. Instead, at the start of your Movement phase, you can move this unit up to 5\" in any direction." },
      { name: "Detonation", description: "Each time this unit is destroyed, before removing it, roll one D6 for each enemy unit within 3\": on a 4+, that unit suffers 1 mortal wound." },
    ],
    points: 20, // 3 models
    models: 3,
    maxModels: 6,
    baseSize: "32mm round",
  },

  // ==================== NEUROGAUNT NODEBEAST ====================
  {
    id: "neurogaunt-nodebeast",
    name: "Neurogaunt Nodebeast",
    faction: "tyranids",
    keywords: ["Infantry", "Synapse", "Neurogaunt Nodebeast"],
    factionKeywords: ["Tyranids"],
    stats: { movement: "6\"", toughness: 4, save: "5+", wounds: 3, leadership: "7+", oc: 0 },
    weapons: [
      {
        name: "Neural Lash",
        range: "Melee", attacks: "3", skill: "3+", strength: 4, ap: -1, damage: "1",
        abilities: ["Psychic"],
      },
    ],
    abilities: [
      { name: "Synaptic Pulse", description: "At the start of your Command phase, each friendly Tyranids Infantry unit within 6\" of this unit that is not Battle-shocked immediately regains Battle-shock status if applicable, and gains +1 to its Leadership characteristic until the end of the turn." },
      { name: "Living Relay", description: "Friendly Tyranids units within 6\" of this unit are considered to be within Synapse range." },
    ],
    points: 35,
    baseSize: "28mm round",
    models: 1,
  },
];

export const TYRANIDS_DETACHMENTS = [
  {
    id: "invasion-fleet",
    name: "Invasion Fleet",
    faction: "tyranids",
    rule: {
      name: "Synaptic Imperative",
      description: "At the start of each of your Command phases, select one of the following Synaptic Imperatives to be active until the start of your next Command phase: Lurk (all Tyranids units have the Stealth ability), Advance (all Tyranids units ignore the penalty for Advancing and shooting), or Strike (all Tyranids units' melee weapons have the Lethal Hits ability).",
    },
    stratagems: [
      {
        name: "Opportunistic Advance",
        cost: 1,
        phase: "Movement",
        when: "Your Movement phase",
        target: "One Tyranids Infantry unit",
        effect: "That unit can make a Normal move of up to 3\" in addition to any move it makes this phase.",
        detachment: "invasion-fleet",
      },
      {
        name: "Bio-Adaptation",
        cost: 1,
        phase: "Shooting",
        when: "Start of your Shooting phase",
        target: "One Tyranids Monster unit",
        effect: "Until the end of the phase, improve the AP of all weapons that model is equipped with by 1.",
        detachment: "invasion-fleet",
      },
      {
        name: "Feeding Frenzy",
        cost: 2,
        phase: "Fight",
        when: "Start of the Fight phase",
        target: "One Tyranids unit",
        effect: "Until the end of the phase, add 1 to the Attacks characteristic of models in that unit.",
        detachment: "invasion-fleet",
      },
      {
        name: "Lurking Terror",
        cost: 1,
        phase: "Movement",
        when: "Start of your opponent's Shooting phase",
        target: "One Tyranids Infantry unit that is not the target of any attacks",
        effect: "Remove that unit from the battlefield and place it into Strategic Reserves.",
        detachment: "invasion-fleet",
      },
      {
        name: "Adaptive Biology",
        cost: 2,
        phase: "Any",
        when: "End of any phase",
        target: "One Tyranids Monster unit",
        effect: "Heal D3 wounds on that unit.",
        detachment: "invasion-fleet",
      },
      {
        name: "Spawning",
        cost: 1,
        phase: "Command",
        when: "Your Command phase",
        target: "One Tervigon unit",
        effect: "That unit can immediately spawn D3 additional Termagants into a friendly Termagants unit within 6\".",
        detachment: "invasion-fleet",
      },
    ],
    enhancements: [
      {
        name: "Resonance Barb",
        points: 10,
        description: "The bearer's Shadow in the Warp range is increased to 24\". In addition, while the bearer is on the battlefield, enemy units within range subtract 2 from Psychic tests instead of 1.",
      },
      {
        name: "Warlord Adaptation",
        points: 15,
        description: "At the start of the bearer's Command phase, you can select one weapon the bearer is equipped with. Until the start of your next Command phase, that weapon's Strength characteristic is increased by 2 and it gains the Devastating Wounds ability.",
      },
      {
        name: "Secretive Predator",
        points: 10,
        description: "The bearer always counts as being in cover for the purpose of ranged attacks. In addition, the bearer has the Stealth ability.",
      },
      {
        name: "Immense Hunger",
        points: 20,
        description: "The bearer has the Feel No Pain 5+ ability. In addition, each time the bearer destroys an enemy model in melee, it regains 1 lost wound.",
      },
    ],
  },
];

export const TYRANIDS_FACTION: Faction = {
  id: "tyranids",
  name: "Tyranids",
  color: "#7c3aed",
  secondaryColor: "#a855f7",
  lore: "The Great Devourer — an extragalactic swarm intelligence that consumes all biomass in its path, evolving endlessly. Each Tyranid creature is a perfectly engineered weapon, directed by the Hive Mind through Synapse creatures. They have consumed hundreds of worlds, leaving only barren rock. They do not seek conquest — only consumption.",
  playstyle: "Aggressive melee and board control. Synapse creatures provide command and synergies. Numerous expendable swarms screen the approach of monstrous creatures. Strong regeneration and adaptability.",
  detachments: TYRANIDS_DETACHMENTS,
  units,
};
