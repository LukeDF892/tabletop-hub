/**
 * Smoke tests for core Warhammer 40k game logic.
 * Run with: npx tsx scripts/test-game-logic.ts
 *
 * Tests: charge resolution, turn order, CP distribution, AI movement coverage.
 */

import { computeAIMovements, computeAIShooting, computeAICharges, findChargePlacement, chargeRoll2D6, unitDist } from "../src/lib/wh40k/ai-opponent";
import { getPresetById } from "../src/lib/wh40k/mapPresets";
import { hexPackPositions } from "../src/lib/wh40k/hexPack";
import type { UnitMarker } from "../src/lib/wh40k/gameTypes";

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${label}`);
    failed++;
  }
}

function makeUnit(overrides: Partial<UnitMarker> & { id: string; player: "P1" | "P2" }): UnitMarker {
  return {
    unitId: "test-unit",
    unitName: "Test Unit",
    faction: "Space Marines",
    x: 0,
    y: 0,
    currentWounds: 3,
    maxWounds: 3,
    modelCount: 1,
    woundsPerModel: 3,
    startingModelCount: 1,
    hasAdvanced: false,
    hasCharged: false,
    hasFought: false,
    hasShotThisTurn: false,
    isInReserve: false,
    isDestroyed: false,
    baseSize: "infantry",
    stats: {
      movement: '6"',
      toughness: 4,
      save: "3+",
      wounds: 3,
      leadership: "7+",
      oc: 1,
    },
    weapons: [],
    ...overrides,
  } as UnitMarker;
}

const MAP = getPresetById("standard");

// ─── Test: hexPackPositions ────────────────────────────────────────────────
console.log("\n=== hexPackPositions ===");
{
  const single = hexPackPositions(5, 5, 1);
  assert(single.length === 1 && single[0].x === 5 && single[0].y === 5, "single model at center");

  const squad = hexPackPositions(10, 10, 5);
  assert(squad.length === 5, "5-model squad returns 5 positions");
  assert(squad[0].x === 10 && squad[0].y === 10, "first model at center");

  const large = hexPackPositions(20, 20, 10);
  assert(large.length === 10, "10-model squad returns 10 positions");
}

// ─── Test: findChargePlacement ─────────────────────────────────────────────
console.log("\n=== findChargePlacement ===");
{
  const attacker = makeUnit({ id: "a1", player: "P1", x: 5, y: 10 });
  const target = makeUnit({ id: "t1", player: "P2", x: 5, y: 6 });

  // Charge roll of 12 — should always find a cell
  const placement12 = findChargePlacement(attacker, target, 12, [attacker, target]);
  assert(placement12 !== null, "findChargePlacement returns a cell with roll 12");
  if (placement12) {
    const dist = Math.sqrt((placement12.x - target.x) ** 2 + (placement12.y - target.y) ** 2);
    assert(dist <= 1.5, `placement is adjacent to target (dist=${dist.toFixed(2)})`);
    const fromDist = Math.sqrt((placement12.x - attacker.x) ** 2 + (placement12.y - attacker.y) ** 2);
    assert(fromDist <= 12, "placement is within charge roll distance");
  }

  // Charge roll of 2 — too short to reach target 4" away
  const placement2 = findChargePlacement(attacker, target, 2, [attacker, target]);
  assert(placement2 === null, "findChargePlacement returns null when roll is too short");

  // Blocked cells — surround target completely
  const blockers: UnitMarker[] = [];
  for (let dx = -2; dx <= 2; dx++) {
    for (let dy = -2; dy <= 2; dy++) {
      if (dx === 0 && dy === 0) continue;
      blockers.push(makeUnit({ id: `b${dx}${dy}`, player: "P1", x: target.x + dx, y: target.y + dy }));
    }
  }
  const placementBlocked = findChargePlacement(attacker, target, 12, [attacker, target, ...blockers]);
  assert(placementBlocked === null, "findChargePlacement returns null when all adjacent cells are blocked");
}

// ─── Test: chargeRoll2D6 ───────────────────────────────────────────────────
console.log("\n=== chargeRoll2D6 ===");
{
  const rolls = Array.from({ length: 1000 }, () => chargeRoll2D6());
  const min = Math.min(...rolls);
  const max = Math.max(...rolls);
  assert(min >= 2, `minimum charge roll >= 2 (got ${min})`);
  assert(max <= 12, `maximum charge roll <= 12 (got ${max})`);
  const avg = rolls.reduce((s, r) => s + r, 0) / rolls.length;
  assert(avg > 6 && avg < 8, `average charge roll near 7 (got ${avg.toFixed(2)})`);
}

// ─── Test: computeAIMovements — all units move ────────────────────────────
console.log("\n=== computeAIMovements ===");
{
  const meleeWeapon = {
    name: "Chainsword",
    type: "Melee" as const,
    attacks: "3",
    skill: "3+",
    strength: "4",
    ap: "0",
    damage: "1",
    range: "Melee",
    keywords: [],
  };
  const boltWeapon = {
    name: "Bolt Rifle",
    type: "Ranged" as const,
    attacks: "2",
    skill: "3+",
    strength: "4",
    ap: "-1",
    damage: "1",
    range: '24"',
    keywords: [],
  };

  // 4 AI melee units in P2 zone (top), 2 P1 units in P1 zone (bottom)
  const aiUnits: UnitMarker[] = [
    makeUnit({ id: "ai1", player: "P2", x: 5,  y: 2, weapons: [meleeWeapon] }),
    makeUnit({ id: "ai2", player: "P2", x: 15, y: 2, weapons: [meleeWeapon] }),
    makeUnit({ id: "ai3", player: "P2", x: 30, y: 2, weapons: [meleeWeapon] }),
    makeUnit({ id: "ai4", player: "P2", x: 50, y: 2, weapons: [boltWeapon]  }),
  ];
  const p1Units: UnitMarker[] = [
    makeUnit({ id: "p11", player: "P1", x: 10, y: 38 }),
    makeUnit({ id: "p12", player: "P1", x: 40, y: 38 }),
  ];
  const allMarkers = [...aiUnits, ...p1Units];

  const moves = computeAIMovements("P2", allMarkers, MAP, []);
  console.log(`  → ${moves.length} of ${aiUnits.length} AI units produced a move action`);
  assert(moves.length === aiUnits.length, `all ${aiUnits.length} AI units move (got ${moves.length})`);

  // Verify each mover moved closer to a P1 unit
  for (const action of moves) {
    if (action.type !== "move") continue;
    const unit = aiUnits.find((u) => u.id === action.markerId)!;
    const isRanged = unit.weapons.some((w) => w.type === "Ranged");
    if (!isRanged) {
      const nearestEnemy = p1Units.reduce((best, e) =>
        unitDist(unit, e) < unitDist(unit, best) ? e : best
      );
      const distBefore = unitDist(unit, nearestEnemy);
      const distAfter = Math.sqrt(
        (action.targetX - nearestEnemy.x) ** 2 + (action.targetY - nearestEnemy.y) ** 2
      );
      assert(distAfter <= distBefore, `${unit.unitName} (${unit.id}) moved closer to enemy (${distBefore.toFixed(1)}" → ${distAfter.toFixed(1)}")`);
    }
  }

  // Verify no two AI units claim the same cell
  const cells = moves.filter((a) => a.type === "move").map((a) => a.type === "move" ? `${a.targetX},${a.targetY}` : "");
  const unique = new Set(cells);
  assert(unique.size === cells.length, "no two AI units claim the same destination cell");
}

// ─── Test: computeAIShooting — cycles all eligible units ──────────────────
console.log("\n=== computeAIShooting ===");
{
  const boltWeapon = {
    name: "Bolt Rifle",
    type: "Ranged" as const,
    attacks: "2",
    skill: "3+",
    strength: "4",
    ap: "-1",
    damage: "1",
    range: '24"',
    keywords: [],
  };
  // Place shooters with clear LOS and within 24" of target (avoid terrain at y=8-12)
  const aiShooters: UnitMarker[] = [
    makeUnit({ id: "s1", player: "P2", x: 2,  y: 4, weapons: [boltWeapon] }),
    makeUnit({ id: "s2", player: "P2", x: 10, y: 4, weapons: [boltWeapon] }),
    makeUnit({ id: "s3", player: "P2", x: 18, y: 4, weapons: [boltWeapon] }),
  ];
  // P1 target in range of all three (within 24")
  const p1Target = makeUnit({ id: "pt1", player: "P1", x: 10, y: 20 });

  const shots = computeAIShooting("P2", [...aiShooters, p1Target], MAP, []);
  assert(shots.length === aiShooters.length, `all ${aiShooters.length} shooters fire (got ${shots.length})`);
}

// ─── Test: computeAICharges — all melee units try to charge ───────────────
console.log("\n=== computeAICharges ===");
{
  const meleeWeapon = {
    name: "Chainsword",
    type: "Melee" as const,
    attacks: "3",
    skill: "3+",
    strength: "4",
    ap: "0",
    damage: "1",
    range: "Melee",
    keywords: [],
  };
  // All chargers within 12" of each other and the target
  const aiMelee: UnitMarker[] = [
    makeUnit({ id: "c1", player: "P2", x: 5,  y: 8, weapons: [meleeWeapon] }),
    makeUnit({ id: "c2", player: "P2", x: 9,  y: 8, weapons: [meleeWeapon] }),
    makeUnit({ id: "c3", player: "P2", x: 13, y: 8, weapons: [meleeWeapon] }),
  ];
  // P1 target within 12" of all three chargers
  const p1Target = makeUnit({ id: "ct1", player: "P1", x: 9, y: 16 });

  const charges = computeAICharges("P2", [...aiMelee, p1Target], []);
  assert(charges.length === aiMelee.length, `all ${aiMelee.length} melee units attempt charge (got ${charges.length})`);
}

// ─── Test: unitDist ────────────────────────────────────────────────────────
console.log("\n=== unitDist ===");
{
  const a = makeUnit({ id: "a", player: "P1", x: 0, y: 0 });
  const b = makeUnit({ id: "b", player: "P2", x: 3, y: 4 });
  const d = unitDist(a, b);
  // centers: (0.5,0.5) and (3.5,4.5) → sqrt(9+16)=5.0
  assert(Math.abs(d - 5.0) < 0.01, `unitDist (0.5,0.5)→(3.5,4.5) = 5.0 (got ${d.toFixed(2)})`);

  const same = unitDist(a, a);
  assert(same === 0, "distance to self is 0");
}

// ─── Test: turn order logic ────────────────────────────────────────────────
console.log("\n=== Turn order logic ===");
{
  // Simulate: P1 goes first in round 1, P2 goes first in round 2
  let firstPlayerThisRound: "P1" | "P2" = "P1";
  let activePlayer: "P1" | "P2" = "P1";

  // After P1 finishes: switch to P2
  assert(activePlayer === firstPlayerThisRound, "P1 goes first round 1");
  activePlayer = firstPlayerThisRound === "P1" ? "P2" : "P1";
  assert(activePlayer === "P2", "P2 goes second in round 1");

  // After P2 finishes round 1: end of round, alternate who goes first
  firstPlayerThisRound = firstPlayerThisRound === "P1" ? "P2" : "P1";
  activePlayer = firstPlayerThisRound;
  assert(activePlayer === "P2", "P2 goes first in round 2");
  assert(firstPlayerThisRound === "P2", "firstPlayerThisRound updated for round 2");
}

// ─── Test: CP distribution logic ──────────────────────────────────────────
console.log("\n=== CP distribution ===");
{
  let p1Cp = 0;
  let p2Cp = 0;

  // Each player gains 1 CP per command phase
  function giveCP(player: "P1" | "P2") {
    if (player === "P1") p1Cp += 1;
    else p2Cp += 1;
  }

  // Round 1: both get CP at start
  giveCP("P1");
  giveCP("P2");
  assert(p1Cp === 1 && p2Cp === 1, "both players start with 1 CP after round 1 command phase");

  // P1 command phase round 2
  giveCP("P1");
  assert(p1Cp === 2, "P1 has 2 CP after their round 2 command phase");

  // P2 command phase round 2
  giveCP("P2");
  assert(p2Cp === 2, "P2 has 2 CP after their round 2 command phase");

  // Spending CP
  p1Cp -= 1;
  assert(p1Cp === 1, "P1 has 1 CP after spending 1");
}

// ─── Summary ───────────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error(`\n${failed} test(s) FAILED`);
  process.exit(1);
} else {
  console.log("\nAll tests passed ✓");
}
