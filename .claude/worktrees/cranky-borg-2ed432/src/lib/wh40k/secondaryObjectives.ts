// Tactical Missions (Secondary Objectives) — Warhammer 40k 10th edition Leviathan deck.

import type { UnitMarker } from "./gameTypes";

export interface TacticalMission {
  id: string;
  name: string;
  description: string;
  scoreCondition: string;
  vp: number;
  // Returns true if the player can score this card right now.
  // State is the current markers + objective control per player.
  check: (params: {
    markers: UnitMarker[];
    player: "P1" | "P2";
    opponent: "P1" | "P2";
    objectiveControl: ("P1" | "P2" | null)[];
    mapWidth: number;
    mapHeight: number;
    unitsDestroyedThisTurn: string[];     // marker IDs destroyed this turn
    unitsDestroyedThisPhase: string[];    // marker IDs destroyed this phase
    objectiveControlAtTurnStart: ("P1" | "P2" | null)[];
    unitsAdvancedThisTurn: string[];      // marker IDs that advanced
  }) => boolean;
}

export const TACTICAL_MISSIONS: TacticalMission[] = [
  {
    id: "tm-assassinate",
    name: "Assassinate",
    description: "Destroy an enemy CHARACTER unit this turn.",
    scoreCondition: "Destroy an enemy CHARACTER unit.",
    vp: 3,
    check: ({ markers, player, unitsDestroyedThisTurn }) => {
      const opponent = player === "P1" ? "P2" : "P1";
      return unitsDestroyedThisTurn.some((id) => {
        const m = markers.find((mk) => mk.id === id);
        return (
          m?.player === opponent &&
          (m?.unitId?.toLowerCase().includes("character") ||
            m?.stats !== undefined) &&
          m?.weapons !== undefined &&
          markers
            .find((mk) => mk.id === id)
            ?.unitName !== undefined
        );
      }) && unitsDestroyedThisTurn.some((id) => {
        const m = markers.find((mk) => mk.id === id);
        return m?.player === opponent && (
          m?.unitName?.toLowerCase().includes("captain") ||
          m?.unitName?.toLowerCase().includes("librarian") ||
          m?.unitName?.toLowerCase().includes("chaplain") ||
          m?.unitName?.toLowerCase().includes("lieutenant") ||
          m?.unitName?.toLowerCase().includes("tyrant") ||
          m?.unitName?.toLowerCase().includes("overlord") ||
          m?.unitName?.toLowerCase().includes("lord") ||
          m?.unitName?.toLowerCase().includes("warden") ||
          m?.unitName?.toLowerCase().includes("prime") ||
          m?.unitName?.toLowerCase().includes("belial") ||
          m?.unitName?.toLowerCase().includes("azrael") ||
          m?.unitName?.toLowerCase().includes("sammael") ||
          m?.unitName?.toLowerCase().includes("ezekiel") ||
          m?.unitName?.toLowerCase().includes("swarmlord") ||
          m?.unitName?.toLowerCase().includes("broodlord") ||
          m?.unitName?.toLowerCase().includes("calgar") ||
          m?.unitName?.toLowerCase().includes("tigurius") ||
          m?.unitName?.toLowerCase().includes("guilliman") ||
          m?.unitName?.toLowerCase().includes("techmarine") ||
          m?.unitName?.toLowerCase().includes("apothecary") ||
          m?.unitName?.toLowerCase().includes("cryptek") ||
          m?.unitName?.toLowerCase().includes("neurotyrant")
        );
      });
    },
  },
  {
    id: "tm-bring-it-down",
    name: "Bring it Down",
    description: "Destroy an enemy MONSTER or VEHICLE unit this turn.",
    scoreCondition: "Destroy an enemy MONSTER or VEHICLE unit.",
    vp: 3,
    check: ({ markers, player, unitsDestroyedThisTurn }) => {
      const opponent = player === "P1" ? "P2" : "P1";
      return unitsDestroyedThisTurn.some((id) => {
        const m = markers.find((mk) => mk.id === id);
        return m?.player === opponent && (
          m?.baseSize === "monster" ||
          m?.baseSize === "dreadnought" ||
          m?.baseSize === "titan" ||
          m?.baseSize === "superheavy"
        );
      });
    },
  },
  {
    id: "tm-overwhelming-force",
    name: "Overwhelming Force",
    description: "Control more than 3 objectives simultaneously.",
    scoreCondition: "Control 4+ objectives at the same time.",
    vp: 4,
    check: ({ objectiveControl, player }) =>
      objectiveControl.filter((c) => c === player).length > 3,
  },
  {
    id: "tm-behind-enemy-lines",
    name: "Behind Enemy Lines",
    description: "Have 2+ units wholly within the enemy deployment zone.",
    scoreCondition: "Have 2 or more units in the enemy deployment zone.",
    vp: 3,
    check: ({ markers, player, mapHeight }) => {
      const opponent = player === "P1" ? "P2" : "P1";
      // P2 deploys in top rows (y < mapHeight*0.25), P1 in bottom rows
      const enemyZoneY = player === "P1" ? [0, Math.floor(mapHeight * 0.25)] : [Math.floor(mapHeight * 0.75), mapHeight];
      const inZone = markers.filter(
        (m) =>
          m.player === player &&
          !m.isDestroyed &&
          !m.isInReserve &&
          !m.isAttached &&
          m.y >= enemyZoneY[0] &&
          m.y < enemyZoneY[1]
      );
      return inZone.length >= 2;
    },
  },
  {
    id: "tm-no-prisoners",
    name: "No Prisoners",
    description: "Destroy 3+ enemy units in a single turn.",
    scoreCondition: "Destroy 3 or more enemy units this turn.",
    vp: 4,
    check: ({ markers, player, unitsDestroyedThisTurn }) => {
      const opponent = player === "P1" ? "P2" : "P1";
      return unitsDestroyedThisTurn.filter((id) => {
        const m = markers.find((mk) => mk.id === id);
        return m?.player === opponent;
      }).length >= 3;
    },
  },
  {
    id: "tm-engage-all-fronts",
    name: "Engage on All Fronts",
    description: "Have units in 3 different table quarters.",
    scoreCondition: "Have at least one unit in 3 different board quarters.",
    vp: 3,
    check: ({ markers, player, mapWidth, mapHeight }) => {
      const midX = mapWidth / 2;
      const midY = mapHeight / 2;
      const quartersOccupied = new Set<number>();
      markers
        .filter((m) => m.player === player && !m.isDestroyed && !m.isInReserve && !m.isAttached)
        .forEach((m) => {
          const q = (m.x >= midX ? 1 : 0) + (m.y >= midY ? 2 : 0);
          quartersOccupied.add(q);
        });
      return quartersOccupied.size >= 3;
    },
  },
  {
    id: "tm-stranglehold",
    name: "Stranglehold",
    description: "Control 3+ objectives, including at least one in the enemy half.",
    scoreCondition: "Control 3+ objectives including 1 in the enemy half.",
    vp: 4,
    check: ({ objectiveControl, player, mapHeight, markers }) => {
      // Check at least 3 objectives controlled
      if (objectiveControl.filter((c) => c === player).length < 3) return false;
      // Proxy: enemy half is the half of the board where the opponent deploys
      // Since we don't have objective coords here, approximate: at least one unit in opponent's half
      const midY = mapHeight / 2;
      const inEnemyHalf = markers.some(
        (m) => m.player === player && !m.isDestroyed && !m.isInReserve &&
          (player === "P1" ? m.y < midY : m.y >= midY)
      );
      return inEnemyHalf;
    },
  },
  {
    id: "tm-storm-hostile-objective",
    name: "Storm Hostile Objective",
    description: "Control an objective that your opponent controlled at the start of your turn.",
    scoreCondition: "Capture an objective the enemy held at turn start.",
    vp: 3,
    check: ({ objectiveControl, player, objectiveControlAtTurnStart }) => {
      const opponent = player === "P1" ? "P2" : "P1";
      return objectiveControl.some(
        (ctrl, i) => ctrl === player && objectiveControlAtTurnStart[i] === opponent
      );
    },
  },
  {
    id: "tm-cleanse",
    name: "Cleanse",
    description: "Control all objectives in your half of the board.",
    scoreCondition: "Control every objective in your deployment half.",
    vp: 3,
    check: ({ objectiveControl, player }) =>
      // Approximate: all even-indexed objectives (first half) controlled by P1, etc.
      objectiveControl.length > 0 &&
      objectiveControl.every((c) => c === player || c === null),
  },
  {
    id: "tm-capture-enemy-stronghold",
    name: "Capture Enemy Stronghold",
    description: "Control 2+ objectives in the enemy deployment zone.",
    scoreCondition: "Control 2 or more objectives deep in enemy territory.",
    vp: 4,
    check: ({ objectiveControl, player }) =>
      objectiveControl.filter((c) => c === player).length >= 2,
  },
  {
    id: "tm-defend-stronghold",
    name: "Defend Stronghold",
    description: "Control all objectives in your deployment zone.",
    scoreCondition: "Hold every objective in your own deployment zone.",
    vp: 3,
    check: ({ objectiveControl, player }) =>
      objectiveControl.length > 0 && objectiveControl.filter((c) => c === player).length > 0,
  },
  {
    id: "tm-cull-the-horde",
    name: "Cull the Horde",
    description: "Destroy 5+ enemy models in a single phase.",
    scoreCondition: "Destroy 5 or more enemy models in one phase.",
    vp: 3,
    check: ({ markers, player, unitsDestroyedThisPhase }) => {
      const opponent = player === "P1" ? "P2" : "P1";
      // Count destroyed enemy units this phase as a proxy for models
      const destroyed = unitsDestroyedThisPhase.filter((id) => {
        const m = markers.find((mk) => mk.id === id);
        return m?.player === opponent;
      });
      return destroyed.length >= 2; // each "unit" marker represents multiple models
    },
  },
  {
    id: "tm-establish-locus",
    name: "Establish Locus",
    description: "Have a CHARACTER unit within 3\" of board centre.",
    scoreCondition: "Move a CHARACTER to the board centre.",
    vp: 3,
    check: ({ markers, player, mapWidth, mapHeight }) => {
      const cx = mapWidth / 2;
      const cy = mapHeight / 2;
      return markers.some(
        (m) =>
          m.player === player &&
          !m.isDestroyed &&
          !m.isInReserve &&
          (m.unitName.toLowerCase().includes("captain") ||
            m.unitName.toLowerCase().includes("lord") ||
            m.unitName.toLowerCase().includes("warden") ||
            m.unitName.toLowerCase().includes("overlord") ||
            m.unitName.toLowerCase().includes("librarian") ||
            m.unitName.toLowerCase().includes("chaplain") ||
            m.unitName.toLowerCase().includes("tyrant") ||
            m.unitName.toLowerCase().includes("prime")) &&
          Math.sqrt((m.x + 0.5 - cx) ** 2 + (m.y + 0.5 - cy) ** 2) <= 3
      );
    },
  },
  {
    id: "tm-rapid-escalation",
    name: "Rapid Escalation",
    description: "Have 3+ units that Advanced this turn.",
    scoreCondition: "Advance with 3 or more units in a single turn.",
    vp: 3,
    check: ({ markers, player, unitsAdvancedThisTurn }) => {
      return unitsAdvancedThisTurn.filter((id) => {
        const m = markers.find((mk) => mk.id === id);
        return m?.player === player && !m?.isDestroyed;
      }).length >= 3;
    },
  },
  {
    id: "tm-recover-assets",
    name: "Recover Assets",
    description: "Control 2 specific objectives (chosen at card draw).",
    scoreCondition: "Control 2 designated objectives.",
    vp: 4,
    check: ({ objectiveControl, player }) =>
      objectiveControl.filter((c) => c === player).length >= 2,
  },
  {
    id: "tm-area-denial",
    name: "Area Denial",
    description: "Have units in all 4 board quarters simultaneously.",
    scoreCondition: "Occupy all 4 quarters of the board.",
    vp: 3,
    check: ({ markers, player, mapWidth, mapHeight }) => {
      const midX = mapWidth / 2;
      const midY = mapHeight / 2;
      const quartersOccupied = new Set<number>();
      markers
        .filter((m) => m.player === player && !m.isDestroyed && !m.isInReserve && !m.isAttached)
        .forEach((m) => {
          const q = (m.x >= midX ? 1 : 0) + (m.y >= midY ? 2 : 0);
          quartersOccupied.add(q);
        });
      return quartersOccupied.size >= 4;
    },
  },
  {
    id: "tm-take-and-hold",
    name: "Take and Hold",
    description: "Control an objective for 3 consecutive turns.",
    scoreCondition: "Hold the same objective for 3 rounds in a row.",
    vp: 4,
    check: ({ objectiveControl, player }) =>
      objectiveControl.filter((c) => c === player).length >= 1,
  },
  {
    id: "tm-marked-for-death",
    name: "Marked for Death",
    description: "Destroy the enemy unit with the most wounds remaining.",
    scoreCondition: "Destroy the enemy's most-wounded unit.",
    vp: 3,
    check: ({ markers, player, unitsDestroyedThisTurn }) => {
      const opponent = player === "P1" ? "P2" : "P1";
      const enemyAlive = markers.filter(
        (m) => m.player === opponent && !m.isDestroyed && !m.isInReserve && !m.isAttached
      );
      if (enemyAlive.length === 0) return false;
      const mostWounded = enemyAlive.reduce((a, b) =>
        a.currentWounds > b.currentWounds ? a : b
      );
      return unitsDestroyedThisTurn.includes(mostWounded.id);
    },
  },
];

// Returns a shuffled copy of the deck.
export function shuffleDeck(): TacticalMission[] {
  const deck = [...TACTICAL_MISSIONS];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}
