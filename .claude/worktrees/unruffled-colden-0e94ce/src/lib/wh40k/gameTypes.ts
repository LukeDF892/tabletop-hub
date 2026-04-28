import type { WeaponProfile } from "./types";

// ── Phase machine ──────────────────────────────────────────────────────────────
export type GamePhase = "setup" | "rolloff" | "deployment" | "game";
export type RoundPhase =
  | "command"
  | "movement"
  | "shooting"
  | "charge"
  | "fight"
  | "morale";

// ── Board / unit ──────────────────────────────────────────────────────────────
export interface DeployedUnit {
  instanceId: string;   // unique per game instance
  unitId: string;       // references Unit.id in faction data
  player: "P1" | "P2";
  x: number;            // inches from left (0–59)
  y: number;            // inches from top  (0–43)
  currentWounds: number;
  maxWounds: number;
  name: string;
  abbrev: string;       // 3-char label
  movement: number;     // parsed inches, e.g. 6
  toughness: number;
  save: string;         // "3+" or "3+/4++"
  leadership: number;
  oc: number;
  weapons: WeaponProfile[];
  keywords: string[];
  status: {
    advanced: boolean;
    inMelee: boolean;
    destroyed: boolean;
    inReserve: boolean;
    infiltrator: boolean;
  };
}

export interface ObjectiveMarker {
  id: number;
  x: number;            // inches from left
  y: number;            // inches from top
  controlled: "P1" | "P2" | null;
}

// ── Rolloff ───────────────────────────────────────────────────────────────────
export interface RolloffState {
  p1AttackerRoll: number | null;
  p2AttackerRoll: number | null;
  attacker: "P1" | "P2" | null;

  p1DeployRoll: number | null;
  p2DeployRoll: number | null;
  deployFirst: "P1" | "P2" | null;

  p1TurnRoll: number | null;
  p2TurnRoll: number | null;
  firstTurn: "P1" | "P2" | null;
}

// ── Log ───────────────────────────────────────────────────────────────────────
export interface ActivityEntry {
  time: string;
  text: string;
  player?: "P1" | "P2" | "system";
}

// ── Army record loaded from Supabase ──────────────────────────────────────────
export interface ArmyEntry {
  unitId: string;
  modelCount: number;
  quantity: number;
  attachedLeaderId?: string;
}

export interface ArmyRecord {
  id: string;
  name: string;
  faction: string;
  subfaction: string | null;
  total_points: number;
  units: { entries: ArmyEntry[] } | ArmyEntry[];
}

// ── Combat helpers ────────────────────────────────────────────────────────────

/** Roll a variable dice expression: "3", "D6", "2D6", "D3" */
export function rollDiceExpr(expr: string): number {
  const fixed = parseInt(expr);
  if (!isNaN(fixed)) return fixed;

  const upper = expr.toUpperCase().trim();
  if (upper === "D3") return Math.floor(Math.random() * 3) + 1;
  if (upper === "D6") return Math.floor(Math.random() * 6) + 1;
  if (upper === "D6+1") return Math.floor(Math.random() * 6) + 2;

  // NdM
  const m = upper.match(/^(\d+)D(\d+)$/);
  if (m) {
    let t = 0;
    for (let i = 0; i < parseInt(m[1]); i++)
      t += Math.floor(Math.random() * parseInt(m[2])) + 1;
    return t;
  }
  return 1;
}

/** Roll n individual d6s, return array of results */
export function rollD6s(n: number): number[] {
  return Array.from({ length: n }, () => Math.floor(Math.random() * 6) + 1);
}

/** 40k wound threshold: S vs T */
export function woundThreshold(s: number, t: number): number {
  if (s >= t * 2) return 2;
  if (s > t) return 3;
  if (s === t) return 4;
  if (s * 2 <= t) return 6;
  return 5;
}

/** Parse a save string and return { armor, invuln } as thresholds (lower = better) */
export function parseSave(saveStr: string): { armor: number; invuln: number | null } {
  const parts = saveStr.split("/");
  const armor = parseInt(parts[0]) || 7; // "3+" → 3
  const invuln = parts[1] ? parseInt(parts[1]) : null; // "4++" → 4
  return { armor, invuln };
}

/** Compute the effective save threshold after AP penalty */
export function effectiveSave(saveStr: string, apStr: string): number {
  const { armor, invuln } = parseSave(saveStr);
  const ap = parseInt(apStr) || 0; // "-2" → -2, "0" → 0
  const modified = armor + Math.abs(ap); // AP -2 makes 3+ into 5+
  if (invuln !== null) return Math.min(modified, invuln);
  return modified;
}

/** Distance in inches between two board positions */
export function distInches(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

export interface AttackResult {
  attackRolls: number[];
  hits: number;
  woundRolls: number[];
  wounds: number;
  saveRolls: number[];
  failedSaves: number;
  totalDamage: number;
  log: string[];
}

/** Full 40k attack sequence for one weapon profile */
export function resolveAttack(
  attackerName: string,
  weaponName: string,
  attacksExpr: string,
  skillStr: string,   // "3+" BS or WS
  strengthStr: string,
  apStr: string,
  damageExpr: string,
  targetToughness: number,
  targetSave: string
): AttackResult {
  const log: string[] = [];

  const numAttacks = rollDiceExpr(attacksExpr);
  const skill = parseInt(skillStr) || 4;
  const strength = parseInt(strengthStr) || 4;
  const threshold = woundThreshold(strength, targetToughness);
  const saveThreshold = effectiveSave(targetSave, apStr);

  // To Hit
  const attackRolls = rollD6s(numAttacks);
  const hits = attackRolls.filter((r) => r >= skill).length;
  log.push(
    `${attackerName} → ${weaponName}: ${numAttacks} attacks → [${attackRolls.join(",")}] = ${hits} hit(s) (${skill}+)`
  );

  if (hits === 0) return { attackRolls, hits, woundRolls: [], wounds: 0, saveRolls: [], failedSaves: 0, totalDamage: 0, log };

  // To Wound (S${strength} vs T${targetToughness})
  const woundRolls = rollD6s(hits);
  const wounds = woundRolls.filter((r) => r >= threshold).length;
  log.push(
    `  Wound (S${strength} vs T${targetToughness}, ${threshold}+): [${woundRolls.join(",")}] = ${wounds} wound(s)`
  );

  if (wounds === 0) return { attackRolls, hits, woundRolls, wounds: 0, saveRolls: [], failedSaves: 0, totalDamage: 0, log };

  // Saves
  let saveRolls: number[] = [];
  let failedSaves: number;
  if (saveThreshold > 6) {
    failedSaves = wounds;
    log.push(`  Saves: auto-fail (Sv ${saveThreshold}+ impossible)`);
  } else {
    saveRolls = rollD6s(wounds);
    const saved = saveRolls.filter((r) => r >= saveThreshold).length;
    failedSaves = wounds - saved;
    log.push(
      `  Saves (${saveThreshold}+, AP${apStr}): [${saveRolls.join(",")}] = ${saved} saved, ${failedSaves} unsaved`
    );
  }

  if (failedSaves === 0) return { attackRolls, hits, woundRolls, wounds, saveRolls, failedSaves: 0, totalDamage: 0, log };

  // Damage
  let totalDamage = 0;
  for (let i = 0; i < failedSaves; i++) totalDamage += rollDiceExpr(damageExpr);
  log.push(`  Damage: ${failedSaves} × ${damageExpr} = ${totalDamage} wounds`);

  return { attackRolls, hits, woundRolls, wounds, saveRolls, failedSaves, totalDamage, log };
}
