export interface TerrainPiece {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}

export interface MapObjective {
  x: number;
  y: number;
}

export interface MapPreset {
  id: string;
  name: string;
  description: string;
  objectives: MapObjective[];
  terrain: TerrainPiece[];
  deploymentDepth: number;
}

export const MAP_PRESETS: MapPreset[] = [
  {
    id: "standard",
    name: "Standard Deployment",
    description: "Classic symmetrical setup — 9\" deployment zones, 5 ruins, 5 objectives.",
    objectives: [
      { x: 30, y: 22 },
      { x: 10, y: 11 },
      { x: 50, y: 11 },
      { x: 10, y: 33 },
      { x: 50, y: 33 },
    ],
    terrain: [
      { x: 18, y: 8,  w: 6, h: 4, label: "Ruin A" },
      { x: 36, y: 8,  w: 6, h: 4, label: "Ruin B" },
      { x: 27, y: 20, w: 8, h: 4, label: "Ruin C" },
      { x: 18, y: 30, w: 6, h: 4, label: "Ruin D" },
      { x: 36, y: 30, w: 6, h: 4, label: "Ruin E" },
    ],
    deploymentDepth: 9,
  },
  {
    id: "dawn_of_war",
    name: "Dawn of War",
    description: "Wider 12\" deployment zones, sparser terrain, objectives spread further apart.",
    objectives: [
      { x: 30, y: 22 },
      { x: 8,  y: 14 },
      { x: 52, y: 14 },
      { x: 8,  y: 30 },
      { x: 52, y: 30 },
    ],
    terrain: [
      { x: 20, y: 16, w: 8, h: 5, label: "Ruin A" },
      { x: 32, y: 19, w: 8, h: 5, label: "Ruin B" },
      { x: 10, y: 20, w: 5, h: 4, label: "Ruin C" },
    ],
    deploymentDepth: 12,
  },
  {
    id: "search_and_destroy",
    name: "Search and Destroy",
    description: "9\" zones with 6 terrain pieces spread across the board.",
    objectives: [
      { x: 30, y: 22 },
      { x: 12, y: 9  },
      { x: 48, y: 9  },
      { x: 12, y: 35 },
      { x: 48, y: 35 },
    ],
    terrain: [
      { x: 15, y: 14, w: 6, h: 4, label: "Ruin A" },
      { x: 39, y: 14, w: 6, h: 4, label: "Ruin B" },
      { x: 26, y: 18, w: 8, h: 4, label: "Ruin C" },
      { x: 15, y: 25, w: 6, h: 4, label: "Ruin D" },
      { x: 39, y: 25, w: 6, h: 4, label: "Ruin E" },
      { x: 27, y: 30, w: 6, h: 4, label: "Ruin F" },
    ],
    deploymentDepth: 9,
  },
  {
    id: "crucible_of_battle",
    name: "Crucible of Battle",
    description: "9\" zones with 7 terrain pieces densely packed in the centre.",
    objectives: [
      { x: 30, y: 22 },
      { x: 10, y: 11 },
      { x: 50, y: 11 },
      { x: 10, y: 33 },
      { x: 50, y: 33 },
    ],
    terrain: [
      { x: 18, y: 10, w: 5, h: 4, label: "Ruin A" },
      { x: 37, y: 10, w: 5, h: 4, label: "Ruin B" },
      { x: 22, y: 16, w: 6, h: 4, label: "Ruin C" },
      { x: 32, y: 16, w: 6, h: 4, label: "Ruin D" },
      { x: 26, y: 22, w: 8, h: 4, label: "Ruin E" },
      { x: 18, y: 27, w: 6, h: 4, label: "Ruin F" },
      { x: 36, y: 27, w: 6, h: 4, label: "Ruin G" },
    ],
    deploymentDepth: 9,
  },
  {
    id: "sweeping_engagement",
    name: "Sweeping Engagement",
    description: "9\" zones with asymmetric terrain favouring P1's right flank.",
    objectives: [
      { x: 30, y: 22 },
      { x: 8,  y: 11 },
      { x: 50, y: 13 },
      { x: 12, y: 33 },
      { x: 50, y: 31 },
    ],
    terrain: [
      { x: 10, y: 16, w: 6, h: 4, label: "Ruin A" },
      { x: 22, y: 14, w: 6, h: 4, label: "Ruin B" },
      { x: 32, y: 19, w: 8, h: 4, label: "Ruin C" },
      { x: 42, y: 14, w: 5, h: 4, label: "Ruin D" },
      { x: 44, y: 22, w: 5, h: 4, label: "Ruin E" },
    ],
    deploymentDepth: 9,
  },
];

export const DEFAULT_PRESET = MAP_PRESETS[0];

export function getPresetById(id: string): MapPreset {
  return MAP_PRESETS.find((p) => p.id === id) ?? DEFAULT_PRESET;
}
