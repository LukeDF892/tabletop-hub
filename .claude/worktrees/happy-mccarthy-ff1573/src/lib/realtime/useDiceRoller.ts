"use client";

import { useState, useCallback } from "react";

export type DiceSides = 4 | 6 | 8 | 10 | 12 | 20 | 100;

export interface DiceResult {
  id: string;
  sides: DiceSides;
  count: number;
  rolls: number[];
  modifier: number;
  advantage: "normal" | "advantage" | "disadvantage";
  total: number;
  rollerName: string;
  timestamp: number;
  isCritical?: boolean;
  isFumble?: boolean;
}

function rollOneDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

interface UseDiceRollerOptions {
  rollerName: string;
  onRoll?: (result: DiceResult) => void;
}

export function useDiceRoller({ rollerName, onRoll }: UseDiceRollerOptions) {
  const [rollHistory, setRollHistory] = useState<DiceResult[]>([]);
  const [lastResult, setLastResult] = useState<DiceResult | null>(null);
  const [isRolling, setIsRolling] = useState(false);

  const rollDice = useCallback(
    (
      sides: DiceSides,
      count: number = 1,
      modifier: number = 0,
      advantage: "normal" | "advantage" | "disadvantage" = "normal"
    ): DiceResult => {
      setIsRolling(true);

      let rolls: number[];

      if (sides === 20 && advantage !== "normal") {
        const roll1 = rollOneDie(20);
        const roll2 = rollOneDie(20);
        const chosen =
          advantage === "advantage"
            ? Math.max(roll1, roll2)
            : Math.min(roll1, roll2);
        rolls = [chosen];
      } else {
        rolls = Array.from({ length: count }, () => rollOneDie(sides));
      }

      const rawSum = rolls.reduce((a, b) => a + b, 0);
      const total = rawSum + modifier;

      const result: DiceResult = {
        id: crypto.randomUUID(),
        sides,
        count,
        rolls,
        modifier,
        advantage,
        total,
        rollerName,
        timestamp: Date.now(),
        isCritical: sides === 20 && rolls[0] === 20,
        isFumble: sides === 20 && rolls[0] === 1,
      };

      setLastResult(result);
      setRollHistory((prev) => {
        const next = [result, ...prev];
        return next.slice(0, 20);
      });

      onRoll?.(result);

      setTimeout(() => setIsRolling(false), 600);

      return result;
    },
    [rollerName, onRoll]
  );

  const clearHistory = useCallback(() => {
    setRollHistory([]);
    setLastResult(null);
  }, []);

  return { rollDice, rollHistory, lastResult, isRolling, clearHistory };
}
