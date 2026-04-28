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

// Board is 60" wide × 44" tall (x=0-60 horizontal, y=0-44 vertical, y=0 is top)
export interface DeploymentZone {
  type: 'rect';
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface MapPreset {
  id: string;
  name: string;
  description: string;
  objectives: MapObjective[];
  terrain: TerrainPiece[];
  deploymentDepth: number; // kept for board fallback rendering
  deploymentType: 'standard' | 'dawn_of_war' | 'search_and_destroy' | 'crucible' | 'sweeping';
  p1Zone: DeploymentZone;
  p2Zone: DeploymentZone;
}

export const MAP_PRESETS: MapPreset[] = [
  {
    id: "standard",
    name: "Standard Deployment",
    description: "Classic symmetrical setup — 9\" deployment zones, 5 ruins, 5 objectives.",
    objectives: [
      { x: 30, y: 39 },
      { x: 30, y: 5  },
      { x: 30, y: 22 },
      { x: 10, y: 22 },
      { x: 50, y: 22 },
    ],
    terrain: [
      { x: 18, y: 8,  w: 6, h: 4, label: "Ruin A" },
      { x: 36, y: 8,  w: 6, h: 4, label: "Ruin B" },
      { x: 27, y: 20, w: 8, h: 4, label: "Ruin C" },
      { x: 18, y: 30, w: 6, h: 4, label: "Ruin D" },
      { x: 36, y: 30, w: 6, h: 4, label: "Ruin E" },
    ],
    deploymentDepth: 9,
    deploymentType: 'standard',
    p1Zone: { type: 'rect', x: 0, y: 35, w: 60, h: 9 },
    p2Zone: { type: 'rect', x: 0, y: 0,  w: 60, h: 9 },
  },
  {
    id: "dawn_of_war",
    name: "Dawn of War",
    description: "Deploy from the short table edge — 12\" zones on left/right flanks.",
    objectives: [
      { x: 5,  y: 22 },
      { x: 55, y: 22 },
      { x: 20, y: 11 },
      { x: 40, y: 11 },
      { x: 30, y: 33 },
    ],
    terrain: [
      { x: 20, y: 16, w: 8, h: 5, label: "Ruin A" },
      { x: 32, y: 19, w: 8, h: 5, label: "Ruin B" },
      { x: 10, y: 20, w: 5, h: 4, label: "Ruin C" },
    ],
    deploymentDepth: 12,
    deploymentType: 'dawn_of_war',
    p1Zone: { type: 'rect', x: 0,  y: 0, w: 12, h: 44 },
    p2Zone: { type: 'rect', x: 48, y: 0, w: 12, h: 44 },
  },
  {
    id: "search_and_destroy",
    name: "Search and Destroy",
    description: "Diagonal corner deployment — P1 bottom-left, P2 top-right.",
    objectives: [
      { x: 8,  y: 38 },
      { x: 52, y: 6  },
      { x: 30, y: 22 },
      { x: 10, y: 10 },
      { x: 50, y: 34 },
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
    deploymentType: 'search_and_destroy',
    p1Zone: { type: 'rect', x: 0,  y: 22, w: 30, h: 22 },
    p2Zone: { type: 'rect', x: 30, y: 0,  w: 30, h: 22 },
  },
  {
    id: "crucible_of_battle",
    name: "Crucible of Battle",
    description: "9\" zones with 7 terrain pieces densely packed in the centre.",
    objectives: [
      { x: 20, y: 12 },
      { x: 40, y: 12 },
      { x: 30, y: 22 },
      { x: 20, y: 32 },
      { x: 40, y: 32 },
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
    deploymentType: 'crucible',
    p1Zone: { type: 'rect', x: 0, y: 35, w: 60, h: 9 },
    p2Zone: { type: 'rect', x: 0, y: 0,  w: 60, h: 9 },
  },
  {
    id: "sweeping_engagement",
    name: "Sweeping Engagement",
    description: "Wider 12\" zones — more room to manoeuvre before contact.",
    objectives: [
      { x: 15, y: 40 },
      { x: 45, y: 40 },
      { x: 30, y: 22 },
      { x: 15, y: 4  },
      { x: 45, y: 4  },
    ],
    terrain: [
      { x: 10, y: 16, w: 6, h: 4, label: "Ruin A" },
      { x: 22, y: 14, w: 6, h: 4, label: "Ruin B" },
      { x: 32, y: 19, w: 8, h: 4, label: "Ruin C" },
      { x: 42, y: 14, w: 5, h: 4, label: "Ruin D" },
      { x: 44, y: 22, w: 5, h: 4, label: "Ruin E" },
    ],
    deploymentDepth: 12,
    deploymentType: 'sweeping',
    p1Zone: { type: 'rect', x: 0, y: 32, w: 60, h: 12 },
    p2Zone: { type: 'rect', x: 0, y: 0,  w: 60, h: 12 },
  },
];

export const DEFAULT_PRESET = MAP_PRESETS[0];

export function getPresetById(id: string): MapPreset {
  return MAP_PRESETS.find((p) => p.id === id) ?? DEFAULT_PRESET;
}
