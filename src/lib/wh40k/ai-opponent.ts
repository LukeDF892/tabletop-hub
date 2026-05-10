import type { UnitMarker } from "./gameTypes";
import type { MapPreset } from "./mapPresets";
import type { WeaponProfile } from "./types";

// ─── Default AI army composition ─────────────────────────────────────────────

export interface AIArmyEntry {
  unitId: string;
  modelCount: number;
  quantity: number;
}

export interface AIArmySpec {
  factionName: string;
  entries: AIArmyEntry[];
}

const DEFAULT_ARMIES: Record<string, AIArmyEntry[]> = {
  "Space Marines": [
    { unitId: "sm-captain",              modelCount: 1,  quantity: 1 }, // 80 pts
    { unitId: "sm-intercessors",         modelCount: 5,  quantity: 2 }, // 90×2=180
    { unitId: "sm-tactical-squad",       modelCount: 5,  quantity: 1 }, // 75
    { unitId: "sm-terminators",          modelCount: 5,  quantity: 1 }, // 175
    { unitId: "sm-redemptor-dreadnought",modelCount: 1,  quantity: 1 }, // 185
    { unitId: "sm-predator-annihilator", modelCount: 1,  quantity: 1 }, // 150
  ],
  "Dark Angels": [
    { unitId: "da-azrael",                   modelCount: 1, quantity: 1 }, // 130
    { unitId: "da-deathwing-terminators",    modelCount: 5, quantity: 2 }, // 175×2=350
    { unitId: "da-deathwing-knights",        modelCount: 5, quantity: 1 }, // 200
    { unitId: "da-ravenwing-black-knights",  modelCount: 3, quantity: 1 }, // 135
    { unitId: "da-ravenwing-dark-talon",     modelCount: 1, quantity: 1 }, // 180
  ],
  "Tyranids": [
    { unitId: "tyr-tyranid-prime",    modelCount: 1,  quantity: 1 }, // 75
    { unitId: "tyr-termagants",       modelCount: 10, quantity: 2 }, // 40×2=80
    { unitId: "tyr-hormagaunts",      modelCount: 10, quantity: 2 }, // 50×2=100
    { unitId: "tyr-tyranid-warriors", modelCount: 3,  quantity: 1 }, // 95
    { unitId: "tyr-genestealers",     modelCount: 5,  quantity: 2 }, // 95×2=190
    { unitId: "tyr-carnifex",         modelCount: 1,  quantity: 2 }, // 115×2=230
  ],
  "Necrons": [
    { unitId: "nec-overlord",              modelCount: 1, quantity: 1 }, // 80
    { unitId: "nec-warriors-flayer",       modelCount: 10,quantity: 2 }, // 130×2=260
    { unitId: "nec-immortals-blaster",     modelCount: 5, quantity: 1 }, // 130
    { unitId: "nec-lychguard-warscythes",  modelCount: 5, quantity: 1 }, // 100
    { unitId: "nec-canoptek-wraiths",      modelCount: 3, quantity: 1 }, // 110
    { unitId: "nec-doomsday-ark",          modelCount: 1, quantity: 1 }, // 195
  ],
};

export function buildDefaultAIArmySpec(factionName: string): AIArmySpec {
  const entries = DEFAULT_ARMIES[factionName] ?? DEFAULT_ARMIES["Space Marines"];
  return { factionName, entries };
}

// ─── Action types returned by AI decision functions ────────────────────────────

export type AIAction =
  | { type: "move"; markerId: string; targetX: number; targetY: number; advance: boolean }
  | { type: "shoot"; attackerId: string; weaponIdx: number; targetId: string }
  | { type: "charge"; attackerId: string; targetId: string }
  | { type: "fight"; attackerId: string; weaponIdx: number; targetId: string };

export interface AICombatResult {
  hits: number;
  wounds: number;
  unsavedWounds: number;
  totalDamage: number;
  newTargetWounds: number;
  newModelCount: number;
  targetDestroyed: boolean;
}

// ─── Internal helpers ──────────────────────────────────────────────────────────

function markerCenter(m: UnitMarker): { x: number; y: number } {
  if (m.modelPositions && m.modelPositions.length > 0) return m.modelPositions[0];
  return { x: m.x + 0.5, y: m.y + 0.5 };
}

export function unitDist(a: UnitMarker, b: UnitMarker): number {
  const pa = markerCenter(a);
  const pb = markerCenter(b);
  return Math.sqrt((pa.x - pb.x) ** 2 + (pa.y - pb.y) ** 2);
}

function parseStat(val: string): number {
  const m = val.replace(/"/g, "").match(/(\d+)/);
  return m ? parseInt(m[1]) : 0;
}

function parseSkill(skill: string): number {
  const m = skill.match(/(\d+)\+/);
  return m ? parseInt(m[1]) : 4;
}

function parseSave(save: string): number {
  const m = save.match(/(\d+)\+/);
  return m ? parseInt(m[1]) : 7;
}

function parseInvSave(save: string): number | null {
  const m = save.match(/(\d+)\+\+/);
  return m ? parseInt(m[1]) : null;
}

function parseAP(ap: string): number {
  return parseInt(ap) || 0;
}

function parseDamageMean(dmg: string): number {
  const s = dmg.trim().toUpperCase();
  if (/^\d+$/.test(s)) return parseInt(s);
  if (s === "D6") return 3.5;
  if (s === "D3") return 2;
  const mm = s.match(/^(\d+)D(\d+)$/);
  if (mm) return parseInt(mm[1]) * ((parseInt(mm[2]) + 1) / 2);
  return 1;
}

function parseDiceExpr(expr: string): number {
  const s = expr.trim().toUpperCase();
  if (/^\d+$/.test(s)) return parseInt(s);
  if (s === "D6") return Math.floor(Math.random() * 6) + 1;
  if (s === "D3") return Math.floor(Math.random() * 3) + 1;
  const mm = s.match(/^(\d+)D(\d+)$/);
  if (mm) {
    let t = 0;
    for (let i = 0; i < parseInt(mm[1]); i++) t += Math.floor(Math.random() * parseInt(mm[2])) + 1;
    return t;
  }
  return 1;
}

function d6(): number {
  return Math.floor(Math.random() * 6) + 1;
}

function rollDice(n: number): number[] {
  return Array.from({ length: n }, () => d6());
}

function getWoundTarget(S: number, T: number): number {
  if (S >= 2 * T) return 2;
  if (S > T) return 3;
  if (S === T) return 4;
  if (S <= Math.floor(T / 2)) return 6;
  return 5;
}

function lineIntersectsRect(
  ax: number, ay: number, bx: number, by: number,
  rx: number, ry: number, rw: number, rh: number
): boolean {
  const minX = Math.min(ax, bx), maxX = Math.max(ax, bx);
  const minY = Math.min(ay, by), maxY = Math.max(ay, by);
  if (maxX < rx || minX > rx + rw || maxY < ry || minY > ry + rh) return false;
  const dx = bx - ax, dy = by - ay;
  let tMin = 0, tMax = 1;
  function clip(p: number, q: number): boolean {
    if (p === 0) return q >= 0;
    const r = q / p;
    if (p < 0) { if (r > tMax) return false; if (r > tMin) tMin = r; }
    else { if (r < tMin) return false; if (r < tMax) tMax = r; }
    return true;
  }
  if (!clip(-dx, ax - rx)) return false;
  if (!clip(dx, rx + rw - ax)) return false;
  if (!clip(-dy, ay - ry)) return false;
  if (!clip(dy, ry + rh - ay)) return false;
  return tMin < tMax;
}

function hasLOS(attacker: UnitMarker, target: UnitMarker, mapPreset: MapPreset): boolean {
  const ap = markerCenter(attacker);
  const tp = markerCenter(target);
  const targetInside = (t: { x: number; y: number; w: number; h: number }) =>
    target.x >= t.x && target.x < t.x + t.w && target.y >= t.y && target.y < t.y + t.h;
  return !mapPreset.terrain.some((t) => {
    if (!lineIntersectsRect(ap.x, ap.y, tp.x, tp.y, t.x, t.y, t.w, t.h)) return false;
    return !targetInside(t);
  });
}

export function isMeleeUnit(unit: UnitMarker): boolean {
  const kws = (unit.keywords ?? []).map((k) => k.toUpperCase());
  if (
    kws.some((k) =>
      k.includes("GENESTEALER") ||
      k.includes("HORMAGAUNT") ||
      k.includes("LICTOR") ||
      k.includes("TRYGON") ||
      k.includes("CARNIFEX")
    )
  ) return true;
  return unit.weapons.every((w) => w.type === "Melee");
}

function rangedWeapons(unit: UnitMarker): Array<{ weapon: WeaponProfile; idx: number }> {
  return unit.weapons
    .map((w, idx) => ({ weapon: w, idx }))
    .filter(({ weapon }) => weapon.type !== "Melee");
}

function meleeWeapons(unit: UnitMarker): Array<{ weapon: WeaponProfile; idx: number }> {
  return unit.weapons
    .map((w, idx) => ({ weapon: w, idx }))
    .filter(({ weapon }) => weapon.type === "Melee");
}

function getWeaponMaxRange(weapon: WeaponProfile): number {
  if (!weapon.range || weapon.type === "Melee") return 0;
  return parseStat(weapon.range);
}

function expectedDamage(attacker: UnitMarker, weapon: WeaponProfile, target: UnitMarker): number {
  const attacksPerModel = parseDamageMean(weapon.attacks);
  const attacks = attacksPerModel * Math.max(1, attacker.modelCount ?? 1);
  const hitChance = Math.max(0, Math.min(1, (7 - parseSkill(weapon.skill)) / 6));
  const S = parseInt(weapon.strength) || 4;
  const T = target.stats.toughness;
  const woundTarget = getWoundTarget(S, T);
  const woundChance = Math.max(0, Math.min(1, (7 - woundTarget) / 6));
  const ap = parseAP(weapon.ap);
  const saveBase = parseSave(target.stats.save);
  const invSave = parseInvSave(target.stats.save);
  const effectiveSave = Math.min(saveBase - ap, invSave ?? 7);
  const failSaveChance = Math.max(0, Math.min(5 / 6, (effectiveSave - 1) / 6));
  const dmg = parseDamageMean(weapon.damage);
  return attacks * hitChance * woundChance * failSaveChance * dmg;
}

// ─── Full dice-rolled attack resolution ───────────────────────────────────────

export function resolveAIAttack(
  attacker: UnitMarker,
  weaponIdx: number,
  target: UnitMarker
): AICombatResult {
  const weapon = attacker.weapons[weaponIdx];
  if (!weapon) {
    return { hits: 0, wounds: 0, unsavedWounds: 0, totalDamage: 0, newTargetWounds: target.currentWounds, newModelCount: target.modelCount ?? 1, targetDestroyed: false };
  }

  const kws = weapon.keywords ?? [];
  const hasTorrent = kws.some((k) => k.toLowerCase() === "torrent");
  const hasLethalHits = kws.some((k) => k.toLowerCase() === "lethal hits");
  const hasDevWounds = kws.some((k) => k.toLowerCase() === "devastating wounds");

  const attacksPerModel = parseDiceExpr(weapon.attacks);
  const numAttacks = attacksPerModel * Math.max(1, attacker.modelCount ?? 1);
  const skillTarget = parseSkill(weapon.skill);

  // Hit rolls
  let hits = 0;
  let autoWounds = 0;
  if (hasTorrent) {
    hits = numAttacks;
  } else {
    const hitRolls = rollDice(numAttacks);
    for (const r of hitRolls) {
      if (r >= skillTarget) {
        if (r === 6 && hasLethalHits) autoWounds++;
        else hits++;
      }
    }
  }

  // Wound rolls
  const S = parseInt(weapon.strength) || 4;
  const T = target.stats.toughness;
  const woundTarget = getWoundTarget(S, T);
  const woundRolls = hits > 0 ? rollDice(hits) : [];
  let mortalWounds = 0;
  let wounds = 0;
  for (const r of woundRolls) {
    if (r === 6 && hasDevWounds) mortalWounds++;
    else if (r >= woundTarget) wounds++;
  }
  wounds += autoWounds;

  // Save rolls
  const ap = parseAP(weapon.ap);
  const saveBase = parseSave(target.stats.save);
  const invSave = parseInvSave(target.stats.save);
  const effectiveSave = Math.min(saveBase - ap, invSave ?? 7);
  const saveRolls = wounds > 0 ? rollDice(wounds) : [];
  const unsavedWounds = saveRolls.filter((r) => r < effectiveSave).length;

  // Damage
  let totalDamage = mortalWounds;
  for (let i = 0; i < unsavedWounds; i++) totalDamage += parseDiceExpr(weapon.damage);

  // FNP
  if (target.feelNoPain && totalDamage > 0) {
    const fnpRolls = rollDice(totalDamage);
    const saved = fnpRolls.filter((r) => r >= target.feelNoPain!).length;
    totalDamage = Math.max(0, totalDamage - saved);
  }

  // Damage cascade across models
  let remainingDmg = totalDamage;
  let curWounds = target.currentWounds;
  let curModelCount = target.modelCount ?? 1;
  const wpm = target.woundsPerModel ?? target.maxWounds ?? 1;
  while (remainingDmg > 0 && curModelCount > 0) {
    if (remainingDmg >= curWounds) {
      remainingDmg -= curWounds;
      curModelCount--;
      curWounds = curModelCount > 0 ? wpm : 0;
    } else {
      curWounds -= remainingDmg;
      remainingDmg = 0;
    }
  }

  return {
    hits: hits + autoWounds,
    wounds,
    unsavedWounds,
    totalDamage,
    newTargetWounds: curWounds,
    newModelCount: Math.max(0, curModelCount),
    targetDestroyed: curModelCount <= 0,
  };
}

// ─── Movement phase AI ────────────────────────────────────────────────────────

export function computeAIMovements(
  aiPlayer: "P1" | "P2",
  markers: UnitMarker[],
  mapPreset: MapPreset,
  movedThisTurn: string[]
): AIAction[] {
  const myUnits = markers.filter(
    (m) =>
      m.player === aiPlayer &&
      !m.isDestroyed &&
      !m.isInReserve &&
      !m.isAttached &&
      !movedThisTurn.includes(m.id)
  );
  const enemies = markers.filter(
    (m) => m.player !== aiPlayer && !m.isDestroyed && !m.isInReserve
  );
  if (enemies.length === 0) return [];

  const actions: AIAction[] = [];

  for (const unit of myUnits) {
    const inCombat = enemies.some((e) => unitDist(unit, e) <= 1.5);
    if (inCombat) continue;

    const movement = parseStat(unit.stats.movement);
    const pos = markerCenter(unit);
    const isMelee = isMeleeUnit(unit);

    if (isMelee) {
      const target = enemies.reduce((best, e) =>
        unitDist(unit, e) < unitDist(unit, best) ? e : best
      );
      const tp = markerCenter(target);
      const d = unitDist(unit, target);
      if (d <= 1.5) continue;

      const moveDist = Math.min(movement, Math.max(0, d - 1));
      const ratio = d > 0 ? moveDist / d : 0;
      const nx = Math.max(0, Math.min(59, Math.round(pos.x + (tp.x - pos.x) * ratio - 0.5)));
      const ny = Math.max(0, Math.min(43, Math.round(pos.y + (tp.y - pos.y) * ratio - 0.5)));

      if (nx !== unit.x || ny !== unit.y) {
        // Skip if occupied
        const occupied = markers.some((m) => m.id !== unit.id && m.x === nx && m.y === ny && !m.isDestroyed && !m.isInReserve);
        if (!occupied) {
          actions.push({ type: "move", markerId: unit.id, targetX: nx, targetY: ny, advance: false });
        }
      }
    } else {
      const ranged = rangedWeapons(unit);
      if (ranged.length === 0) continue;

      const bestWeapon = ranged.reduce((best, r) =>
        getWeaponMaxRange(r.weapon) > getWeaponMaxRange(best.weapon) ? r : best
      );
      const maxRange = getWeaponMaxRange(bestWeapon.weapon);
      const optimalRange = maxRange > 0 ? maxRange * 0.5 : 12;

      const target = enemies.reduce((best, e) => {
        const de = unitDist(unit, e);
        const db = unitDist(unit, best);
        if (de <= maxRange && (db > maxRange || de < db)) return e;
        return best;
      });

      const tp = markerCenter(target);
      const d = unitDist(unit, target);
      if (d <= optimalRange) continue;

      const moveDist = Math.min(movement, Math.max(0, d - optimalRange));
      const ratio = d > 0 ? moveDist / d : 0;

      // Try a cover position first
      let nx = Math.round(pos.x + (tp.x - pos.x) * ratio - 0.5);
      let ny = Math.round(pos.y + (tp.y - pos.y) * ratio - 0.5);

      const coverPos = mapPreset.terrain
        .flatMap((t) => [
          { x: t.x, y: t.y },
          { x: t.x + Math.floor(t.w / 2), y: t.y },
          { x: t.x, y: t.y + Math.floor(t.h / 2) },
          { x: t.x + t.w - 1, y: t.y + t.h - 1 },
        ])
        .find((c) => {
          const coverDist = Math.sqrt((c.x - pos.x) ** 2 + (c.y - pos.y) ** 2);
          if (coverDist > movement) return false;
          const distToTarget = Math.sqrt((c.x - tp.x) ** 2 + (c.y - tp.y) ** 2);
          if (maxRange > 0 && distToTarget > maxRange) return false;
          const occupied = markers.some((m) => m.id !== unit.id && m.x === c.x && m.y === c.y && !m.isDestroyed && !m.isInReserve);
          return !occupied;
        });

      if (coverPos) { nx = coverPos.x; ny = coverPos.y; }

      nx = Math.max(0, Math.min(59, nx));
      ny = Math.max(0, Math.min(43, ny));

      if (nx !== unit.x || ny !== unit.y) {
        const occupied = markers.some((m) => m.id !== unit.id && m.x === nx && m.y === ny && !m.isDestroyed && !m.isInReserve);
        if (!occupied) {
          actions.push({ type: "move", markerId: unit.id, targetX: nx, targetY: ny, advance: false });
        }
      }
    }
  }

  return actions;
}

// ─── Shooting phase AI ────────────────────────────────────────────────────────

export function computeAIShooting(
  aiPlayer: "P1" | "P2",
  markers: UnitMarker[],
  mapPreset: MapPreset,
  shotThisTurn: string[]
): AIAction[] {
  const myUnits = markers.filter(
    (m) =>
      m.player === aiPlayer &&
      !m.isDestroyed &&
      !m.isInReserve &&
      !m.isAttached &&
      !shotThisTurn.includes(m.id)
  );
  const enemies = markers.filter(
    (m) => m.player !== aiPlayer && !m.isDestroyed && !m.isInReserve
  );

  const actions: AIAction[] = [];

  for (const unit of myUnits) {
    const inCombat = enemies.some((e) => unitDist(unit, e) <= 1.5);
    if (inCombat) continue;

    const ranged = rangedWeapons(unit);
    if (ranged.length === 0) continue;

    let bestAction: AIAction | null = null;
    let bestScore = -1;

    for (const { weapon, idx } of ranged) {
      const maxRange = getWeaponMaxRange(weapon);
      if (maxRange === 0) continue;

      for (const enemy of enemies) {
        const d = unitDist(unit, enemy);
        if (d > maxRange) continue;
        if (!hasLOS(unit, enemy, mapPreset)) continue;

        const score = expectedDamage(unit, weapon, enemy);
        const wouldKill = score >= enemy.currentWounds;
        const adjusted = wouldKill ? score * 2 : score;

        if (adjusted > bestScore) {
          bestScore = adjusted;
          bestAction = { type: "shoot", attackerId: unit.id, weaponIdx: idx, targetId: enemy.id };
        }
      }
    }

    if (bestAction) actions.push(bestAction);
  }

  return actions;
}

// ─── Charge phase AI ─────────────────────────────────────────────────────────

export function computeAICharges(
  aiPlayer: "P1" | "P2",
  markers: UnitMarker[],
  chargedThisTurn: string[]
): AIAction[] {
  const myUnits = markers.filter(
    (m) =>
      m.player === aiPlayer &&
      !m.isDestroyed &&
      !m.isInReserve &&
      !m.isAttached &&
      !chargedThisTurn.includes(m.id) &&
      m.weapons.some((w) => w.type === "Melee")
  );
  const enemies = markers.filter(
    (m) => m.player !== aiPlayer && !m.isDestroyed && !m.isInReserve
  );

  const actions: AIAction[] = [];

  for (const unit of myUnits) {
    const alreadyEngaged = enemies.some((e) => unitDist(unit, e) <= 1.5);
    if (alreadyEngaged) continue;

    const target = enemies
      .filter((e) => unitDist(unit, e) <= 12)
      .reduce<UnitMarker | null>((best, e) => {
        if (!best) return e;
        return unitDist(unit, e) < unitDist(unit, best) ? e : best;
      }, null);
    if (!target) continue;

    const melee = meleeWeapons(unit);
    if (melee.length === 0) continue;

    if (!isMeleeUnit(unit)) {
      const bestMelee = melee.reduce((best, r) =>
        expectedDamage(unit, r.weapon, target) > expectedDamage(unit, best.weapon, target) ? r : best
      );
      if (expectedDamage(unit, bestMelee.weapon, target) < 0.5) continue;
    }

    actions.push({ type: "charge", attackerId: unit.id, targetId: target.id });
  }

  return actions;
}

// ─── Fight phase AI ──────────────────────────────────────────────────────────

export function computeAIFights(
  aiPlayer: "P1" | "P2",
  markers: UnitMarker[],
  foughtThisTurn: string[]
): AIAction[] {
  const myUnits = markers.filter(
    (m) =>
      m.player === aiPlayer &&
      !m.isDestroyed &&
      !m.isInReserve &&
      !m.isAttached &&
      !foughtThisTurn.includes(m.id) &&
      m.weapons.some((w) => w.type === "Melee")
  );
  const enemies = markers.filter(
    (m) => m.player !== aiPlayer && !m.isDestroyed && !m.isInReserve
  );

  const actions: AIAction[] = [];

  for (const unit of myUnits) {
    const engagedEnemies = enemies.filter((e) => unitDist(unit, e) <= 2);
    if (engagedEnemies.length === 0) continue;

    const melee = meleeWeapons(unit);
    if (melee.length === 0) continue;

    // Prefer finishing off low-wound targets, then highest OC threat
    const target = engagedEnemies.reduce((best, e) => {
      const scoreE = e.currentWounds <= 2 ? 10000 - e.currentWounds : e.currentWounds * Math.max(1, e.stats?.oc ?? 1);
      const scoreB = best.currentWounds <= 2 ? 10000 - best.currentWounds : best.currentWounds * Math.max(1, best.stats?.oc ?? 1);
      return scoreE > scoreB ? e : best;
    });

    const bestWeapon = melee.reduce((best, r) =>
      expectedDamage(unit, r.weapon, target) > expectedDamage(unit, best.weapon, target) ? r : best
    );

    actions.push({ type: "fight", attackerId: unit.id, weaponIdx: bestWeapon.idx, targetId: target.id });
  }

  return actions;
}

// ─── Charge placement helper ──────────────────────────────────────────────────

export function chargeRoll2D6(): number {
  return (Math.floor(Math.random() * 6) + 1) + (Math.floor(Math.random() * 6) + 1);
}

// Find the best adjacent cell to place a charging unit next to its target.
// Returns null if no valid placement exists within maxDist of the attacker's current pos.
export function findChargePlacement(
  attacker: UnitMarker,
  target: UnitMarker,
  maxDist: number,
  markers: UnitMarker[]
): { x: number; y: number } | null {
  const tp = markerCenter(target);
  // Try all cells in a 3×3 ring around the target
  const candidates: { x: number; y: number }[] = [];
  for (let dx = -2; dx <= 2; dx++) {
    for (let dy = -2; dy <= 2; dy++) {
      const cx = Math.round(tp.x + dx - 0.5);
      const cy = Math.round(tp.y + dy - 0.5);
      if (cx < 0 || cx > 59 || cy < 0 || cy > 43) continue;
      const distToTarget = Math.sqrt((cx + 0.5 - tp.x) ** 2 + (cy + 0.5 - tp.y) ** 2);
      if (distToTarget > 1.5) continue; // must be adjacent
      const distFromAttacker = Math.sqrt((cx - attacker.x) ** 2 + (cy - attacker.y) ** 2);
      if (distFromAttacker > maxDist) continue;
      const occupied = markers.some((m) => m.id !== attacker.id && m.x === cx && m.y === cy && !m.isDestroyed && !m.isInReserve);
      if (!occupied) candidates.push({ x: cx, y: cy });
    }
  }
  if (candidates.length === 0) return null;
  // Pick closest to attacker's current position
  return candidates.reduce((best, c) => {
    const db = Math.sqrt((best.x - attacker.x) ** 2 + (best.y - attacker.y) ** 2);
    const dc = Math.sqrt((c.x - attacker.x) ** 2 + (c.y - attacker.y) ** 2);
    return dc < db ? c : best;
  });
}
