export const RACES = [
  { value: "Human", label: "Human", bonuses: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 } },
  { value: "High Elf", label: "Elf — High Elf", bonuses: { dex: 2, int: 1 } },
  { value: "Wood Elf", label: "Elf — Wood Elf", bonuses: { dex: 2, wis: 1 } },
  { value: "Dark Elf (Drow)", label: "Elf — Dark Elf (Drow)", bonuses: { dex: 2, cha: 1 } },
  { value: "Hill Dwarf", label: "Dwarf — Hill Dwarf", bonuses: { con: 2, wis: 1 } },
  { value: "Mountain Dwarf", label: "Dwarf — Mountain Dwarf", bonuses: { con: 2, str: 2 } },
  { value: "Lightfoot Halfling", label: "Halfling — Lightfoot", bonuses: { dex: 2, cha: 1 } },
  { value: "Stout Halfling", label: "Halfling — Stout", bonuses: { dex: 2, con: 1 } },
  { value: "Forest Gnome", label: "Gnome — Forest Gnome", bonuses: { int: 2, dex: 1 } },
  { value: "Rock Gnome", label: "Gnome — Rock Gnome", bonuses: { int: 2, con: 1 } },
  { value: "Half-Elf", label: "Half-Elf", bonuses: { cha: 2 }, note: "+1 to two other abilities" },
  { value: "Half-Orc", label: "Half-Orc", bonuses: { str: 2, con: 1 } },
  { value: "Tiefling", label: "Tiefling", bonuses: { cha: 2, int: 1 } },
  { value: "Dragonborn (Black)", label: "Dragonborn — Black (Acid)", bonuses: { str: 2, cha: 1 } },
  { value: "Dragonborn (Blue)", label: "Dragonborn — Blue (Lightning)", bonuses: { str: 2, cha: 1 } },
  { value: "Dragonborn (Brass)", label: "Dragonborn — Brass (Fire)", bonuses: { str: 2, cha: 1 } },
  { value: "Dragonborn (Bronze)", label: "Dragonborn — Bronze (Lightning)", bonuses: { str: 2, cha: 1 } },
  { value: "Dragonborn (Copper)", label: "Dragonborn — Copper (Acid)", bonuses: { str: 2, cha: 1 } },
  { value: "Dragonborn (Gold)", label: "Dragonborn — Gold (Fire)", bonuses: { str: 2, cha: 1 } },
  { value: "Dragonborn (Green)", label: "Dragonborn — Green (Poison)", bonuses: { str: 2, cha: 1 } },
  { value: "Dragonborn (Red)", label: "Dragonborn — Red (Fire)", bonuses: { str: 2, cha: 1 } },
  { value: "Dragonborn (Silver)", label: "Dragonborn — Silver (Cold)", bonuses: { str: 2, cha: 1 } },
  { value: "Dragonborn (White)", label: "Dragonborn — White (Cold)", bonuses: { str: 2, cha: 1 } },
  { value: "Aasimar", label: "Aasimar", bonuses: { cha: 2, wis: 1 } },
  { value: "Goliath", label: "Goliath", bonuses: { str: 2, con: 1 } },
  { value: "Air Genasi", label: "Genasi — Air", bonuses: { dex: 2, con: 1 } },
  { value: "Earth Genasi", label: "Genasi — Earth", bonuses: { con: 2, str: 1 } },
  { value: "Fire Genasi", label: "Genasi — Fire", bonuses: { con: 2, int: 1 } },
  { value: "Water Genasi", label: "Genasi — Water", bonuses: { con: 2, wis: 1 } },
  { value: "Tabaxi", label: "Tabaxi", bonuses: { dex: 2, cha: 1 } },
  { value: "Kenku", label: "Kenku", bonuses: { dex: 2, wis: 1 } },
  { value: "Lizardfolk", label: "Lizardfolk", bonuses: { con: 2, wis: 1 } },
  { value: "Tortle", label: "Tortle", bonuses: { str: 2, wis: 1 } },
];

export const ALIGNMENTS = [
  "Lawful Good", "Neutral Good", "Chaotic Good",
  "Lawful Neutral", "True Neutral", "Chaotic Neutral",
  "Lawful Evil", "Neutral Evil", "Chaotic Evil",
];

export const BACKGROUNDS = [
  "Acolyte", "Charlatan", "Criminal", "Entertainer", "Folk Hero",
  "Guild Artisan", "Hermit", "Noble", "Outlander", "Sage",
  "Sailor", "Soldier", "Urchin",
];

export const BACKGROUND_SKILLS: Record<string, [string, string]> = {
  Acolyte: ["Insight", "Religion"],
  Charlatan: ["Deception", "Sleight of Hand"],
  Criminal: ["Deception", "Stealth"],
  Entertainer: ["Acrobatics", "Performance"],
  "Folk Hero": ["Animal Handling", "Survival"],
  "Guild Artisan": ["Insight", "Persuasion"],
  Hermit: ["Medicine", "Religion"],
  Noble: ["History", "Persuasion"],
  Outlander: ["Athletics", "Survival"],
  Sage: ["Arcana", "History"],
  Sailor: ["Athletics", "Perception"],
  Soldier: ["Athletics", "Intimidation"],
  Urchin: ["Sleight of Hand", "Stealth"],
};

export interface ClassData {
  value: string;
  hitDie: number;
  savingThrows: string[];
  skillCount: number;
  skillChoices: string[];
  subclasses: string[];
  spellcasting: boolean;
  cantripsKnown?: number[];
  spellsKnown?: number[];
}

export const CLASSES: ClassData[] = [
  {
    value: "Barbarian", hitDie: 12, savingThrows: ["str", "con"], skillCount: 2,
    skillChoices: ["Animal Handling", "Athletics", "Intimidation", "Nature", "Perception", "Survival"],
    subclasses: ["Path of the Berserker", "Path of the Totem Warrior", "Path of the Ancestral Guardian", "Path of the Storm Herald", "Path of the Zealot", "Path of the Beast", "Path of Wild Magic", "Path of the Giant", "Path of the World Tree"],
    spellcasting: false,
  },
  {
    value: "Bard", hitDie: 8, savingThrows: ["dex", "cha"], skillCount: 3,
    skillChoices: ["Acrobatics", "Animal Handling", "Arcana", "Athletics", "Deception", "History", "Insight", "Intimidation", "Investigation", "Medicine", "Nature", "Perception", "Performance", "Persuasion", "Religion", "Sleight of Hand", "Stealth", "Survival"],
    subclasses: ["College of Lore", "College of Valor", "College of Glamour", "College of Swords", "College of Whispers", "College of Eloquence", "College of Creation", "College of Spirits"],
    spellcasting: true, cantripsKnown: [0,2,2,2,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,4,4],
    spellsKnown: [0,4,5,6,7,8,9,10,11,12,14,15,15,16,18,19,19,20,22,22,22],
  },
  {
    value: "Cleric", hitDie: 8, savingThrows: ["wis", "cha"], skillCount: 2,
    skillChoices: ["History", "Insight", "Medicine", "Persuasion", "Religion"],
    subclasses: ["Life Domain", "Light Domain", "Trickery Domain", "Knowledge Domain", "Nature Domain", "Tempest Domain", "War Domain", "Arcana Domain", "Death Domain", "Forge Domain", "Grave Domain", "Order Domain", "Peace Domain", "Twilight Domain"],
    spellcasting: true, cantripsKnown: [0,3,3,3,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,5],
  },
  {
    value: "Druid", hitDie: 8, savingThrows: ["int", "wis"], skillCount: 2,
    skillChoices: ["Arcana", "Animal Handling", "Insight", "Medicine", "Nature", "Perception", "Religion", "Survival"],
    subclasses: ["Circle of the Land", "Circle of the Moon", "Circle of Dreams", "Circle of the Shepherd", "Circle of Spores", "Circle of Stars", "Circle of Wildfire", "Circle of the Sea"],
    spellcasting: true, cantripsKnown: [0,2,2,2,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,4],
  },
  {
    value: "Fighter", hitDie: 10, savingThrows: ["str", "con"], skillCount: 2,
    skillChoices: ["Acrobatics", "Animal Handling", "Athletics", "History", "Insight", "Intimidation", "Perception", "Survival"],
    subclasses: ["Champion", "Battle Master", "Eldritch Knight", "Arcane Archer", "Cavalier", "Samurai", "Psi Warrior", "Rune Knight", "Echo Knight"],
    spellcasting: false,
  },
  {
    value: "Monk", hitDie: 8, savingThrows: ["str", "dex"], skillCount: 2,
    skillChoices: ["Acrobatics", "Athletics", "History", "Insight", "Religion", "Stealth"],
    subclasses: ["Way of the Open Hand", "Way of Shadow", "Way of the Four Elements", "Way of the Drunken Master", "Way of the Kensei", "Way of the Sun Soul", "Way of Mercy", "Way of the Astral Self", "Way of the Long Death", "Way of the Ascendant Dragon"],
    spellcasting: false,
  },
  {
    value: "Paladin", hitDie: 10, savingThrows: ["wis", "cha"], skillCount: 2,
    skillChoices: ["Athletics", "Insight", "Intimidation", "Medicine", "Persuasion", "Religion"],
    subclasses: ["Oath of Devotion", "Oath of the Ancients", "Oath of Vengeance", "Oath of Conquest", "Oath of Glory", "Oath of the Watchers", "Oath of Redemption", "Oathbreaker"],
    spellcasting: true, cantripsKnown: new Array(21).fill(0),
    spellsKnown: [0,0,2,3,3,4,4,5,5,5,6,6,6,7,7,7,8,8,8,9,9],
  },
  {
    value: "Ranger", hitDie: 10, savingThrows: ["str", "dex"], skillCount: 3,
    skillChoices: ["Animal Handling", "Athletics", "Insight", "Investigation", "Nature", "Perception", "Stealth", "Survival"],
    subclasses: ["Hunter", "Beast Master", "Gloom Stalker", "Horizon Walker", "Monster Slayer", "Fey Wanderer", "Swarmkeeper", "Drakewarden"],
    spellcasting: true, cantripsKnown: new Array(21).fill(0),
    spellsKnown: [0,0,2,3,3,4,4,5,5,5,6,6,6,7,7,7,8,8,8,9,9],
  },
  {
    value: "Rogue", hitDie: 8, savingThrows: ["dex", "int"], skillCount: 4,
    skillChoices: ["Acrobatics", "Athletics", "Deception", "Insight", "Intimidation", "Investigation", "Perception", "Performance", "Persuasion", "Sleight of Hand", "Stealth"],
    subclasses: ["Thief", "Assassin", "Arcane Trickster", "Inquisitive", "Mastermind", "Scout", "Swashbuckler", "Phantom", "Soulknife"],
    spellcasting: false,
  },
  {
    value: "Sorcerer", hitDie: 6, savingThrows: ["con", "cha"], skillCount: 2,
    skillChoices: ["Arcana", "Deception", "Insight", "Intimidation", "Persuasion", "Religion"],
    subclasses: ["Draconic Bloodline", "Wild Magic", "Shadow Magic", "Divine Soul", "Storm Sorcery", "Aberrant Mind", "Clockwork Soul", "Lunar Sorcery"],
    spellcasting: true, cantripsKnown: [0,4,4,4,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,6],
    spellsKnown: [0,2,3,4,5,6,7,8,9,10,11,12,12,13,13,14,14,15,15,15,15],
  },
  {
    value: "Warlock", hitDie: 8, savingThrows: ["wis", "cha"], skillCount: 2,
    skillChoices: ["Arcana", "Deception", "History", "Intimidation", "Investigation", "Nature", "Religion"],
    subclasses: ["The Archfey", "The Fiend", "The Great Old One", "The Celestial", "The Hexblade", "The Fathomless", "The Genie", "The Undying", "The Undead"],
    spellcasting: true, cantripsKnown: [0,2,2,2,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,4],
    spellsKnown: [0,2,3,4,5,6,7,8,9,10,10,11,11,12,12,13,13,14,14,15,15],
  },
  {
    value: "Wizard", hitDie: 6, savingThrows: ["int", "wis"], skillCount: 2,
    skillChoices: ["Arcana", "History", "Insight", "Investigation", "Medicine", "Religion"],
    subclasses: ["School of Abjuration", "School of Conjuration", "School of Divination", "School of Enchantment", "School of Evocation", "School of Illusion", "School of Necromancy", "School of Transmutation", "Bladesinger", "War Magic", "Order of Scribes", "Chronurgy Magic", "Graviturgy Magic"],
    spellcasting: true, cantripsKnown: [0,3,3,3,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,5],
  },
  {
    value: "Artificer", hitDie: 8, savingThrows: ["con", "int"], skillCount: 2,
    skillChoices: ["Arcana", "History", "Investigation", "Medicine", "Nature", "Perception", "Sleight of Hand"],
    subclasses: ["Alchemist", "Armorer", "Artillerist", "Battle Smith"],
    spellcasting: true, cantripsKnown: [0,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
  },
];

export const SKILLS = [
  { name: "Acrobatics", ability: "dex" },
  { name: "Animal Handling", ability: "wis" },
  { name: "Arcana", ability: "int" },
  { name: "Athletics", ability: "str" },
  { name: "Deception", ability: "cha" },
  { name: "History", ability: "int" },
  { name: "Insight", ability: "wis" },
  { name: "Intimidation", ability: "cha" },
  { name: "Investigation", ability: "int" },
  { name: "Medicine", ability: "wis" },
  { name: "Nature", ability: "int" },
  { name: "Perception", ability: "wis" },
  { name: "Performance", ability: "cha" },
  { name: "Persuasion", ability: "cha" },
  { name: "Religion", ability: "int" },
  { name: "Sleight of Hand", ability: "dex" },
  { name: "Stealth", ability: "dex" },
  { name: "Survival", ability: "wis" },
] as const;

export const ABILITY_LABELS = {
  str: "Strength", dex: "Dexterity", con: "Constitution",
  int: "Intelligence", wis: "Wisdom", cha: "Charisma",
} as const;

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

// Point Buy costs: score -> cost
export const POINT_BUY_COSTS: Record<number, number> = {
  8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9,
};

export const PROFICIENCY_BONUS = [0, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6];

export function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function modStr(score: number): string {
  const m = abilityMod(score);
  return m >= 0 ? `+${m}` : `${m}`;
}

export function profBonus(level: number): number {
  return PROFICIENCY_BONUS[level] ?? 2;
}

// SRD Spell lists by class (abbreviated but comprehensive)
export const SRD_SPELLS: Record<string, Record<number, string[]>> = {
  Wizard: {
    0: ["Acid Splash", "Blade Ward", "Chill Touch", "Dancing Lights", "Fire Bolt", "Friends", "Light", "Mage Hand", "Mending", "Message", "Minor Illusion", "Poison Spray", "Prestidigitation", "Ray of Frost", "Shocking Grasp", "True Strike"],
    1: ["Alarm", "Burning Hands", "Charm Person", "Chromatic Orb", "Color Spray", "Comprehend Languages", "Detect Magic", "Disguise Self", "Expeditious Retreat", "False Life", "Feather Fall", "Find Familiar", "Floating Disk", "Fog Cloud", "Grease", "Hideous Laughter", "Identify", "Illusory Script", "Jump", "Longstrider", "Mage Armor", "Magic Missile", "Protection from Evil and Good", "Ray of Sickness", "Shield", "Silent Image", "Sleep", "Thunderwave", "Unseen Servant", "Witch Bolt"],
    2: ["Alter Self", "Arcane Lock", "Blindness/Deafness", "Blur", "Cloud of Daggers", "Continual Flame", "Crown of Madness", "Darkness", "Darkvision", "Detect Thoughts", "Enlarge/Reduce", "Flaming Sphere", "Gust of Wind", "Hold Person", "Invisibility", "Knock", "Levitate", "Locate Object", "Magic Mouth", "Magic Weapon", "Misty Step", "Mirror Image", "Nystul's Magic Aura", "Phantasmal Force", "Ray of Enfeeblement", "Rope Trick", "Scorching Ray", "See Invisibility", "Shatter", "Spider Climb", "Suggestion", "Web"],
    3: ["Animate Dead", "Bestow Curse", "Blink", "Clairvoyance", "Counterspell", "Dispel Magic", "Fear", "Fireball", "Fly", "Gaseous Form", "Glyph of Warding", "Haste", "Hypnotic Pattern", "Leomund's Tiny Hut", "Lightning Bolt", "Magic Circle", "Major Image", "Melf's Minute Meteors", "Nondetection", "Phantom Steed", "Protection from Energy", "Remove Curse", "Sending", "Sleet Storm", "Slow", "Stinking Cloud", "Tongues", "Vampiric Touch", "Water Breathing"],
    4: ["Arcane Eye", "Banishment", "Black Tentacles", "Blight", "Confusion", "Control Water", "Dimension Door", "Fabricate", "Fire Shield", "Greater Invisibility", "Hallucinatory Terrain", "Ice Storm", "Leomund's Secret Chest", "Locate Creature", "Mordenkainen's Faithful Hound", "Mordenkainen's Private Sanctum", "Otiluke's Resilient Sphere", "Phantasmal Killer", "Polymorph", "Stone Shape", "Stoneskin", "Wall of Fire"],
    5: ["Animate Objects", "Bigby's Hand", "Cloudkill", "Cone of Cold", "Conjure Elemental", "Contact Other Plane", "Creation", "Dominate Person", "Dream", "Geas", "Hold Monster", "Legend Lore", "Mislead", "Modify Memory", "Passwall", "Planar Binding", "Rary's Telepathic Bond", "Scrying", "Seeming", "Telekinesis", "Teleportation Circle", "Wall of Force", "Wall of Stone"],
    6: ["Chain Lightning", "Circle of Death", "Contingency", "Create Undead", "Disintegrate", "Drawmij's Instant Summons", "Eyebite", "Flesh to Stone", "Globe of Invulnerability", "Guards and Wards", "Magic Jar", "Mass Suggestion", "Move Earth", "Otiluke's Freezing Sphere", "Otto's Irresistible Dance", "Programmed Illusion", "Sunbeam", "True Seeing", "Wall of Ice"],
    7: ["Delayed Blast Fireball", "Etherealness", "Finger of Death", "Forcecage", "Mirage Arcane", "Mordenkainen's Magnificent Mansion", "Mordenkainen's Sword", "Plane Shift", "Power Word Pain", "Prismatic Spray", "Project Image", "Reverse Gravity", "Sequester", "Simulacrum", "Symbol", "Teleport"],
    8: ["Antimagic Field", "Antipathy/Sympathy", "Clone", "Control Weather", "Demiplane", "Dominate Monster", "Feeblemind", "Glibness", "Illusory Dragon", "Incendiary Cloud", "Maze", "Mind Blank", "Power Word Stun", "Sunburst", "Telepathy"],
    9: ["Astral Projection", "Foresight", "Gate", "Imprisonment", "Mass Polymorph", "Meteor Swarm", "Power Word Kill", "Prismatic Wall", "Shapechange", "Time Stop", "True Polymorph", "Weird", "Wish"],
  },
  Sorcerer: {
    0: ["Acid Splash", "Blade Ward", "Chill Touch", "Dancing Lights", "Fire Bolt", "Friends", "Light", "Mage Hand", "Mending", "Message", "Minor Illusion", "Poison Spray", "Prestidigitation", "Ray of Frost", "Shocking Grasp", "True Strike"],
    1: ["Burning Hands", "Charm Person", "Chromatic Orb", "Color Spray", "Comprehend Languages", "Detect Magic", "Disguise Self", "Expeditious Retreat", "False Life", "Feather Fall", "Fog Cloud", "Jump", "Mage Armor", "Magic Missile", "Ray of Sickness", "Shield", "Silent Image", "Sleep", "Thunderwave", "Witch Bolt"],
    2: ["Alter Self", "Blindness/Deafness", "Blur", "Cloud of Daggers", "Crown of Madness", "Darkness", "Darkvision", "Detect Thoughts", "Enlarge/Reduce", "Gust of Wind", "Hold Person", "Invisibility", "Knock", "Levitate", "Mirror Image", "Misty Step", "Phantasmal Force", "Scorching Ray", "See Invisibility", "Shatter", "Spider Climb", "Suggestion", "Web"],
    3: ["Blink", "Clairvoyance", "Counterspell", "Daylight", "Dispel Magic", "Fear", "Fireball", "Fly", "Gaseous Form", "Haste", "Hypnotic Pattern", "Lightning Bolt", "Major Image", "Protection from Energy", "Sleet Storm", "Slow", "Stinking Cloud", "Tongues", "Water Breathing", "Water Walk"],
    4: ["Banishment", "Blight", "Confusion", "Dimension Door", "Dominate Beast", "Greater Invisibility", "Ice Storm", "Polymorph", "Stoneskin", "Wall of Fire"],
    5: ["Animate Objects", "Cloudkill", "Cone of Cold", "Creation", "Dominate Person", "Hold Monster", "Insect Plague", "Seeming", "Telekinesis", "Teleportation Circle", "Wall of Stone"],
    6: ["Chain Lightning", "Circle of Death", "Disintegrate", "Eyebite", "Globe of Invulnerability", "Mass Suggestion", "Move Earth", "Sunbeam", "True Seeing"],
    7: ["Delayed Blast Fireball", "Etherealness", "Finger of Death", "Fire Storm", "Plane Shift", "Prismatic Spray", "Reverse Gravity", "Teleport"],
    8: ["Dominate Monster", "Earthquake", "Incendiary Cloud", "Power Word Stun", "Sunburst"],
    9: ["Gate", "Meteor Swarm", "Power Word Kill", "Time Stop", "Wish"],
  },
  Cleric: {
    0: ["Guidance", "Light", "Mending", "Resistance", "Sacred Flame", "Spare the Dying", "Thaumaturgy"],
    1: ["Bane", "Bless", "Command", "Create or Destroy Water", "Cure Wounds", "Detect Evil and Good", "Detect Magic", "Detect Poison and Disease", "Guiding Bolt", "Healing Word", "Inflict Wounds", "Protection from Evil and Good", "Purify Food and Drink", "Sanctuary", "Shield of Faith"],
    2: ["Aid", "Augury", "Blindness/Deafness", "Calm Emotions", "Continual Flame", "Enhance Ability", "Find Traps", "Gentle Repose", "Hold Person", "Lesser Restoration", "Locate Object", "Prayer of Healing", "Protection from Poison", "Silence", "Spiritual Weapon", "Warding Bond", "Zone of Truth"],
    3: ["Animate Dead", "Beacon of Hope", "Bestow Curse", "Clairvoyance", "Create Food and Water", "Daylight", "Dispel Magic", "Feign Death", "Glyph of Warding", "Magic Circle", "Mass Healing Word", "Meld into Stone", "Protection from Energy", "Remove Curse", "Revivify", "Sending", "Speak with Dead", "Spirit Guardians", "Tongues", "Water Walk"],
    4: ["Banishment", "Control Water", "Death Ward", "Divination", "Freedom of Movement", "Guardian of Faith", "Locate Creature", "Stone Shape"],
    5: ["Commune", "Contagion", "Dispel Evil and Good", "Flame Strike", "Geas", "Greater Restoration", "Hallow", "Insect Plague", "Legend Lore", "Mass Cure Wounds", "Planar Binding", "Raise Dead", "Scrying"],
    6: ["Blade Barrier", "Create Undead", "Find the Path", "Forbiddance", "Harm", "Heal", "Heroes' Feast", "Planar Ally", "True Seeing", "Word of Recall"],
    7: ["Conjure Celestial", "Divine Word", "Etherealness", "Fire Storm", "Plane Shift", "Regenerate", "Resurrection", "Symbol"],
    8: ["Antimagic Field", "Control Weather", "Earthquake", "Holy Aura"],
    9: ["Astral Projection", "Gate", "Mass Heal", "True Resurrection"],
  },
  Druid: {
    0: ["Druidcraft", "Guidance", "Mending", "Poison Spray", "Produce Flame", "Resistance", "Shillelagh", "Thorn Whip"],
    1: ["Absorb Elements", "Animal Friendship", "Beast Bond", "Charm Person", "Create or Destroy Water", "Cure Wounds", "Detect Magic", "Detect Poison and Disease", "Entangle", "Faerie Fire", "Fog Cloud", "Goodberry", "Healing Word", "Jump", "Longstrider", "Purify Food and Drink", "Speak with Animals", "Thunderwave"],
    2: ["Animal Messenger", "Barkskin", "Beast Sense", "Darkvision", "Enhance Ability", "Find Traps", "Flame Blade", "Flaming Sphere", "Gust of Wind", "Heat Metal", "Hold Person", "Lesser Restoration", "Locate Animals or Plants", "Locate Object", "Moonbeam", "Pass without Trace", "Protection from Poison", "Spike Growth"],
    3: ["Call Lightning", "Conjure Animals", "Daylight", "Dispel Magic", "Erupting Earth", "Feign Death", "Meld into Stone", "Plant Growth", "Protection from Energy", "Sleet Storm", "Speak with Plants", "Wall of Water", "Water Breathing", "Water Walk", "Wind Wall"],
    4: ["Blight", "Confusion", "Conjure Minor Elementals", "Conjure Woodland Beings", "Control Water", "Dominate Beast", "Giant Insect", "Grasping Vine", "Hallucinatory Terrain", "Ice Storm", "Locate Creature", "Polymorph", "Stone Shape", "Stoneskin", "Wall of Fire"],
    5: ["Antilife Shell", "Awaken", "Commune with Nature", "Cone of Cold", "Conjure Elemental", "Contagion", "Control Winds", "Geas", "Greater Restoration", "Insect Plague", "Mass Cure Wounds", "Planar Binding", "Reincarnate", "Scrying", "Tree Stride", "Wall of Stone"],
    6: ["Conjure Fey", "Find the Path", "Heal", "Heroes' Feast", "Move Earth", "Sunbeam", "Transport via Plants", "True Seeing", "Wall of Thorns", "Wind Walk"],
    7: ["Fire Storm", "Mirage Arcane", "Plane Shift", "Regenerate", "Reverse Gravity"],
    8: ["Animal Shapes", "Antipathy/Sympathy", "Control Weather", "Earthquake", "Feeblemind", "Sunburst", "Tsunami"],
    9: ["Foresight", "Shapechange", "Storm of Vengeance", "True Resurrection"],
  },
  Bard: {
    0: ["Blade Ward", "Dancing Lights", "Friends", "Light", "Mage Hand", "Mending", "Message", "Minor Illusion", "Prestidigitation", "True Strike", "Thunderclap", "Vicious Mockery"],
    1: ["Animal Friendship", "Bane", "Charm Person", "Color Spray", "Comprehend Languages", "Cure Wounds", "Detect Magic", "Disguise Self", "Dissonant Whispers", "Earth Tremor", "Faerie Fire", "Feather Fall", "Healing Word", "Heroism", "Identify", "Illusory Script", "Longstrider", "Silent Image", "Sleep", "Speak with Animals", "Tasha's Hideous Laughter", "Thunderwave", "Unseen Servant"],
    2: ["Animal Messenger", "Blindness/Deafness", "Calm Emotions", "Cloud of Daggers", "Crown of Madness", "Detect Thoughts", "Enhance Ability", "Enthrall", "Heat Metal", "Hold Person", "Invisibility", "Knock", "Lesser Restoration", "Locate Animals or Plants", "Locate Object", "Magic Mouth", "Phantasmal Force", "See Invisibility", "Shatter", "Silence", "Suggestion", "Zone of Truth"],
    3: ["Bestow Curse", "Clairvoyance", "Dispel Magic", "Fear", "Feign Death", "Glyph of Warding", "Hypnotic Pattern", "Leomund's Tiny Hut", "Major Image", "Plant Growth", "Sending", "Slow", "Speak with Dead", "Speak with Plants", "Stinking Cloud", "Tongues"],
    4: ["Compulsion", "Confusion", "Dimension Door", "Freedom of Movement", "Greater Invisibility", "Hallucinatory Terrain", "Locate Creature", "Phantasmal Killer", "Polymorph"],
    5: ["Animate Objects", "Awaken", "Dominate Person", "Dream", "Geas", "Greater Restoration", "Hold Monster", "Legend Lore", "Mass Cure Wounds", "Mislead", "Modify Memory", "Planar Binding", "Raise Dead", "Rary's Telepathic Bond", "Scrying", "Seeming", "Teleportation Circle"],
    6: ["Eyebite", "Find the Path", "Guards and Wards", "Mass Suggestion", "Otto's Irresistible Dance", "Programmed Illusion", "True Seeing"],
    7: ["Etherealness", "Forcecage", "Mirage Arcane", "Mordenkainen's Magnificent Mansion", "Mordenkainen's Sword", "Project Image", "Regenerate", "Resurrection", "Symbol", "Teleport"],
    8: ["Dominate Monster", "Feeblemind", "Glibness", "Mind Blank", "Power Word Stun"],
    9: ["Foresight", "Power Word Heal", "Power Word Kill", "True Polymorph"],
  },
  Paladin: {
    0: [],
    1: ["Bless", "Command", "Compelled Duel", "Cure Wounds", "Detect Evil and Good", "Detect Magic", "Detect Poison and Disease", "Divine Favor", "Heroism", "Protection from Evil and Good", "Purify Food and Drink", "Searing Smite", "Shield of Faith", "Thunderous Smite", "Wrathful Smite"],
    2: ["Aid", "Branding Smite", "Find Steed", "Lesser Restoration", "Locate Object", "Magic Weapon", "Protection from Poison", "Zone of Truth"],
    3: ["Aura of Vitality", "Blinding Smite", "Create Food and Water", "Crusader's Mantle", "Daylight", "Dispel Magic", "Elemental Weapon", "Magic Circle", "Remove Curse", "Revivify"],
    4: ["Aura of Life", "Aura of Purity", "Banishment", "Death Ward", "Locate Creature", "Staggering Smite"],
    5: ["Banishing Smite", "Circle of Power", "Destructive Wave", "Dispel Evil and Good", "Geas", "Holy Weapon", "Raise Dead"],
  },
  Ranger: {
    0: [],
    1: ["Alarm", "Animal Friendship", "Cure Wounds", "Detect Magic", "Detect Poison and Disease", "Ensnaring Strike", "Fog Cloud", "Goodberry", "Hail of Thorns", "Hunter's Mark", "Jump", "Longstrider", "Speak with Animals"],
    2: ["Animal Messenger", "Barkskin", "Beast Sense", "Cordon of Arrows", "Darkvision", "Find Traps", "Lesser Restoration", "Locate Animals or Plants", "Locate Object", "Pass without Trace", "Protection from Poison", "Silence", "Spike Growth"],
    3: ["Conjure Barrage", "Daylight", "Lightning Arrow", "Nondetection", "Plant Growth", "Protection from Energy", "Speak with Plants", "Water Breathing", "Water Walk", "Wind Wall"],
    4: ["Conjure Woodland Beings", "Freedom of Movement", "Grasping Vine", "Locate Creature", "Stoneskin"],
    5: ["Commune with Nature", "Conjure Volley", "Steel Wind Strike", "Swift Quiver", "Tree Stride"],
  },
  Warlock: {
    0: ["Blade Ward", "Chill Touch", "Eldritch Blast", "Friends", "Mage Hand", "Minor Illusion", "Poison Spray", "Prestidigitation", "True Strike"],
    1: ["Armor of Agathys", "Arms of Hadar", "Charm Person", "Comprehend Languages", "Expeditious Retreat", "Hellish Rebuke", "Hex", "Illusory Script", "Protection from Evil and Good", "Unseen Servant", "Witch Bolt"],
    2: ["Cloud of Daggers", "Crown of Madness", "Darkness", "Enthrall", "Hold Person", "Invisibility", "Mirror Image", "Misty Step", "Ray of Enfeeblement", "Shatter", "Spider Climb", "Suggestion"],
    3: ["Counterspell", "Dispel Magic", "Fear", "Fly", "Gaseous Form", "Hunger of Hadar", "Hypnotic Pattern", "Magic Circle", "Major Image", "Remove Curse", "Tongues", "Vampiric Touch"],
    4: ["Banishment", "Blight", "Dimension Door", "Hallucinatory Terrain"],
    5: ["Contact Other Plane", "Dream", "Hold Monster", "Scrying"],
    6: ["Arcane Gate", "Circle of Death", "Create Undead", "Eyebite", "Flesh to Stone", "Mass Suggestion", "True Seeing"],
    7: ["Etherealness", "Finger of Death", "Forcecage", "Plane Shift"],
    8: ["Demiplane", "Dominate Monster", "Feeblemind", "Glibness", "Power Word Stun"],
    9: ["Astral Projection", "Foresight", "Gate", "Imprisonment", "Power Word Kill", "True Polymorph"],
  },
  Artificer: {
    0: ["Acid Splash", "Fire Bolt", "Guidance", "Light", "Mage Hand", "Mending", "Message", "Poison Spray", "Prestidigitation", "Ray of Frost", "Resistance", "Shocking Grasp", "Spare the Dying", "Thorn Whip", "Thunderclap"],
    1: ["Absorb Elements", "Alarm", "Arcane Weapon", "Cure Wounds", "Detect Magic", "Disguise Self", "Expeditious Retreat", "Faerie Fire", "False Life", "Feather Fall", "Grease", "Identify", "Jump", "Longstrider", "Purify Food and Drink", "Sanctuary", "Snare"],
    2: ["Aid", "Alter Self", "Arcane Lock", "Blur", "Continual Flame", "Darkvision", "Enhance Ability", "Enlarge/Reduce", "Heat Metal", "Invisibility", "Lesser Restoration", "Levitate", "Magic Mouth", "Magic Weapon", "Protection from Poison", "Rope Trick", "See Invisibility", "Shatter", "Spider Climb", "Web"],
    3: ["Blink", "Dispel Magic", "Elemental Weapon", "Fly", "Glyph of Warding", "Haste", "Protection from Energy", "Revivify"],
    4: ["Arcane Eye", "Fabricate", "Freedom of Movement", "Leomund's Secret Chest", "Mordenkainen's Faithful Hound", "Mordenkainen's Private Sanctum", "Otiluke's Resilient Sphere", "Stone Shape", "Stoneskin"],
    5: ["Animate Objects", "Bigby's Hand", "Creation", "Greater Restoration", "Wall of Stone"],
  },
};

// Copy relevant class spell lists
SRD_SPELLS.Fighter = { 0: [], 1: [], 2: [], 3: [] }; // Eldritch Knight only
SRD_SPELLS.Rogue = { 0: [], 1: [], 2: [], 3: [], 4: [] }; // Arcane Trickster only
SRD_SPELLS.Monk = {};
SRD_SPELLS.Barbarian = {};

export const SPELL_SLOTS: Record<string, number[][]> = {
  Wizard: [
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [2, 0, 0, 0, 0, 0, 0, 0, 0],
    [3, 0, 0, 0, 0, 0, 0, 0, 0],
    [4, 2, 0, 0, 0, 0, 0, 0, 0],
    [4, 3, 0, 0, 0, 0, 0, 0, 0],
    [4, 3, 2, 0, 0, 0, 0, 0, 0],
    [4, 3, 3, 0, 0, 0, 0, 0, 0],
    [4, 3, 3, 1, 0, 0, 0, 0, 0],
    [4, 3, 3, 2, 0, 0, 0, 0, 0],
    [4, 3, 3, 3, 1, 0, 0, 0, 0],
    [4, 3, 3, 3, 2, 0, 0, 0, 0],
    [4, 3, 3, 3, 2, 1, 0, 0, 0],
    [4, 3, 3, 3, 2, 1, 0, 0, 0],
    [4, 3, 3, 3, 2, 1, 1, 0, 0],
    [4, 3, 3, 3, 2, 1, 1, 0, 0],
    [4, 3, 3, 3, 2, 1, 1, 1, 0],
    [4, 3, 3, 3, 2, 1, 1, 1, 0],
    [4, 3, 3, 3, 2, 1, 1, 1, 1],
    [4, 3, 3, 3, 3, 1, 1, 1, 1],
    [4, 3, 3, 3, 3, 2, 1, 1, 1],
    [4, 3, 3, 3, 3, 2, 2, 1, 1],
  ],
};
// Reuse for full casters
SPELL_SLOTS.Cleric = SPELL_SLOTS.Wizard;
SPELL_SLOTS.Druid = SPELL_SLOTS.Wizard;
SPELL_SLOTS.Bard = SPELL_SLOTS.Wizard;
SPELL_SLOTS.Sorcerer = SPELL_SLOTS.Wizard;
