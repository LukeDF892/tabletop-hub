import type { UnitStats, WeaponProfile } from "./types";

export type GamePhase =
  | "setup"
  | "rolloff"
  | "deployment"
  | "command"
  | "movement"
  | "shooting"
  | "charge"
  | "fight"
  | "morale"
  | "scoring";

export type BaseSize =
  | "infantry"
  | "cavalry"
  | "bike"
  | "elite_infantry"
  | "terminator"
  | "dreadnought"
  | "walker"
  | "monster"
  | "vehicle"
  | "titan"
  | "superheavy";

export interface RolloffResult {
  attacker: "P1" | "P2" | null;
  firstDeployer: "P1" | "P2" | null;
  firstTurn: "P1" | "P2" | null;
}

export interface UnitMarker {
  id: string;
  unitId: string;
  unitName: string;
  player: "P1" | "P2";
  x: number;           // inches from left (0–60)
  y: number;           // inches from top  (0–44)
  currentWounds: number;   // wounds on the current front model
  maxWounds: number;       // wounds per model (= woundsPerModel)
  modelCount?: number;     // remaining models in squad (default 1)
  woundsPerModel?: number; // wounds per individual model (default = maxWounds)
  startingModelCount?: number; // original squad size for half-strength check
  stats: UnitStats;
  weapons: WeaponProfile[];
  hasAdvanced: boolean;
  hasCharged: boolean;
  hasFought: boolean;
  hasShotThisTurn: boolean;
  isInReserve: boolean;
  isDestroyed: boolean;
  baseSize: BaseSize;
  faction: string;
  attachedCharacterId?: string;    // marker ID of character riding along
  attachedCharacterName?: string;  // display name
  isAttached?: boolean;            // true = this marker is the attached character
  attachedToMarkerId?: string;     // parent unit marker ID
  battleShocked?: boolean;         // 10th ed Battle-shock: OC 0, -1 to rolls
  belowHalfStrength?: boolean;     // unit is below half strength
  lastPhaseWoundsTaken?: number;   // wounds taken this phase (for Reanimation)
  keywords?: string[];             // unit keywords (e.g. "Deep Strike")
}

export interface DeploymentState {
  p1UnitsPlaced: string[];   // marker ids that have been placed on board
  p2UnitsPlaced: string[];
  currentDeployer: "P1" | "P2";
}

export interface GameState {
  phase: GamePhase;
  round: number;             // 1–5
  markers: UnitMarker[];
  p1Cp: number;
  p2Cp: number;
  p1Vp: number;
  p2Vp: number;
  rolloffResults: RolloffResult;
  activePlayer: "P1" | "P2";
  deployment: DeploymentState;
  pointsLimit: number;
}

export interface RangeIndicator {
  centreX: number;     // inches
  centreY: number;     // inches
  radiusInches: number;
  colour: string;
  opacity?: number;
  strokeOpacity?: number;
  label?: string;
}
