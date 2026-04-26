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
  currentWounds: number;
  maxWounds: number;
  stats: UnitStats;
  weapons: WeaponProfile[];
  hasAdvanced: boolean;
  hasCharged: boolean;
  hasFought: boolean;
  hasShotThisTurn: boolean;
  isInReserve: boolean;
  isDestroyed: boolean;
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
