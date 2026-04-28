"use client";

import { useState } from "react";
import { useDiceRoller, type DiceSides } from "@/lib/realtime/useDiceRoller";
import { Minus, Plus, RotateCcw } from "lucide-react";

const DICE: { sides: DiceSides; label: string; color: string }[] = [
  { sides: 4, label: "d4", color: "#7c3aed" },
  { sides: 6, label: "d6", color: "#d97706" },
  { sides: 8, label: "d8", color: "#0ea5e9" },
  { sides: 10, label: "d10", color: "#10b981" },
  { sides: 12, label: "d12", color: "#f59e0b" },
  { sides: 20, label: "d20", color: "#dc2626" },
  { sides: 100, label: "d%", color: "#8b5cf6" },
];

interface DiceRollerProps {
  rollerName: string;
  onRoll?: (event: string, payload: Record<string, unknown>) => void;
}

export default function DiceRoller({ rollerName, onRoll }: DiceRollerProps) {
  const [selectedDice, setSelectedDice] = useState<DiceSides>(20);
  const [diceCount, setDiceCount] = useState(1);
  const [modifier, setModifier] = useState(0);
  const [advantage, setAdvantage] = useState<
    "normal" | "advantage" | "disadvantage"
  >("normal");

  const { rollDice, rollHistory, lastResult, isRolling, clearHistory } =
    useDiceRoller({
      rollerName,
      onRoll: (result) => {
        onRoll?.("dice_roll", {
          sides: result.sides,
          total: result.total,
          rolls: result.rolls,
          modifier: result.modifier,
          advantage: result.advantage,
          rollerName: result.rollerName,
          isCritical: result.isCritical,
          isFumble: result.isFumble,
        });
      },
    });

  function handleRoll() {
    rollDice(selectedDice, diceCount, modifier, advantage);
  }

  const selectedDiceInfo = DICE.find((d) => d.sides === selectedDice)!;

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-5"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-card)",
      }}
    >
      <div className="flex items-center justify-between">
        <h3
          className="font-cinzel text-sm font-semibold tracking-wide uppercase"
          style={{ color: "var(--text-primary)" }}
        >
          Dice Roller
        </h3>
        <button
          onClick={clearHistory}
          className="flex items-center gap-1 text-xs transition-colors"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.color = "var(--text-primary)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "var(--text-muted)")
          }
        >
          <RotateCcw size={11} />
          Clear
        </button>
      </div>

      {/* Dice Selection */}
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
        {DICE.map((d) => (
          <button
            key={d.sides}
            onClick={() => setSelectedDice(d.sides)}
            className="aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 text-xs font-bold font-mono transition-all"
            style={{
              backgroundColor:
                selectedDice === d.sides
                  ? `${d.color}25`
                  : "rgba(255,255,255,0.04)",
              border: `1px solid ${
                selectedDice === d.sides ? d.color : "rgba(255,255,255,0.08)"
              }`,
              color: selectedDice === d.sides ? d.color : "var(--text-muted)",
              boxShadow:
                selectedDice === d.sides ? `0 0 12px ${d.color}30` : "none",
              transform: selectedDice === d.sides ? "scale(1.05)" : "scale(1)",
            }}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Count + Modifier */}
      <div className="flex gap-4">
        {/* Dice count */}
        <div className="flex flex-col gap-1.5">
          <span
            className="text-xs font-medium"
            style={{ color: "var(--text-muted)" }}
          >
            Count
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDiceCount(Math.max(1, diceCount - 1))}
              className="w-7 h-7 rounded-md flex items-center justify-center transition-colors"
              style={{
                backgroundColor: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "var(--text-muted)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor =
                  "rgba(255,255,255,0.1)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor =
                  "rgba(255,255,255,0.06)")
              }
            >
              <Minus size={12} />
            </button>
            <span
              className="w-8 text-center font-mono font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              {diceCount}
            </span>
            <button
              onClick={() => setDiceCount(Math.min(20, diceCount + 1))}
              className="w-7 h-7 rounded-md flex items-center justify-center transition-colors"
              style={{
                backgroundColor: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "var(--text-muted)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor =
                  "rgba(255,255,255,0.1)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor =
                  "rgba(255,255,255,0.06)")
              }
            >
              <Plus size={12} />
            </button>
          </div>
        </div>

        {/* Modifier */}
        <div className="flex flex-col gap-1.5">
          <span
            className="text-xs font-medium"
            style={{ color: "var(--text-muted)" }}
          >
            Modifier
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setModifier(modifier - 1)}
              className="w-7 h-7 rounded-md flex items-center justify-center transition-colors"
              style={{
                backgroundColor: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "var(--text-muted)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor =
                  "rgba(255,255,255,0.1)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor =
                  "rgba(255,255,255,0.06)")
              }
            >
              <Minus size={12} />
            </button>
            <span
              className="w-10 text-center font-mono font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              {modifier >= 0 ? `+${modifier}` : modifier}
            </span>
            <button
              onClick={() => setModifier(modifier + 1)}
              className="w-7 h-7 rounded-md flex items-center justify-center transition-colors"
              style={{
                backgroundColor: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "var(--text-muted)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor =
                  "rgba(255,255,255,0.1)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor =
                  "rgba(255,255,255,0.06)")
              }
            >
              <Plus size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Advantage/Disadvantage — only for d20 */}
      {selectedDice === 20 && (
        <div className="flex gap-2">
          {(
            [
              { key: "normal", label: "Normal" },
              { key: "advantage", label: "Advantage" },
              { key: "disadvantage", label: "Disadv." },
            ] as const
          ).map((opt) => (
            <button
              key={opt.key}
              onClick={() => setAdvantage(opt.key)}
              className="flex-1 py-1.5 rounded-md text-xs font-medium transition-all"
              style={{
                backgroundColor:
                  advantage === opt.key
                    ? opt.key === "advantage"
                      ? "rgba(16,185,129,0.2)"
                      : opt.key === "disadvantage"
                      ? "rgba(220,38,38,0.2)"
                      : "rgba(124,58,237,0.2)"
                    : "rgba(255,255,255,0.04)",
                border:
                  advantage === opt.key
                    ? opt.key === "advantage"
                      ? "1px solid rgba(16,185,129,0.4)"
                      : opt.key === "disadvantage"
                      ? "1px solid rgba(220,38,38,0.4)"
                      : "1px solid rgba(124,58,237,0.4)"
                    : "1px solid rgba(255,255,255,0.08)",
                color:
                  advantage === opt.key
                    ? opt.key === "advantage"
                      ? "#10b981"
                      : opt.key === "disadvantage"
                      ? "#ef4444"
                      : "var(--purple-light)"
                    : "var(--text-muted)",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Roll Button */}
      <button
        onClick={handleRoll}
        disabled={isRolling}
        className="w-full py-3 rounded-lg font-cinzel font-semibold tracking-wide transition-all"
        style={{
          backgroundColor: isRolling
            ? `${selectedDiceInfo.color}20`
            : `${selectedDiceInfo.color}30`,
          border: `1px solid ${selectedDiceInfo.color}${isRolling ? "40" : "70"}`,
          color: isRolling ? `${selectedDiceInfo.color}80` : selectedDiceInfo.color,
          boxShadow: isRolling
            ? "none"
            : `0 0 20px ${selectedDiceInfo.color}20`,
          animation: isRolling ? "spin 0.6s ease-in-out" : "none",
        }}
      >
        {isRolling
          ? "Rolling..."
          : `Roll ${diceCount}${selectedDiceInfo.label}${
              modifier !== 0
                ? modifier > 0
                  ? ` + ${modifier}`
                  : ` - ${Math.abs(modifier)}`
                : ""
            }`}
      </button>

      {/* Last Result */}
      {lastResult && (
        <div
          className="rounded-lg p-4 text-center"
          style={{
            backgroundColor: lastResult.isCritical
              ? "rgba(217,119,6,0.12)"
              : lastResult.isFumble
              ? "rgba(220,38,38,0.12)"
              : "rgba(255,255,255,0.04)",
            border: `1px solid ${
              lastResult.isCritical
                ? "rgba(217,119,6,0.4)"
                : lastResult.isFumble
                ? "rgba(220,38,38,0.4)"
                : "rgba(255,255,255,0.1)"
            }`,
          }}
        >
          {lastResult.isCritical && (
            <p
              className="font-cinzel text-xs font-bold uppercase tracking-widest mb-1"
              style={{ color: "#d97706" }}
            >
              Critical Hit!
            </p>
          )}
          {lastResult.isFumble && (
            <p
              className="font-cinzel text-xs font-bold uppercase tracking-widest mb-1"
              style={{ color: "#dc2626" }}
            >
              Critical Fumble!
            </p>
          )}
          <p
            className="font-cinzel text-4xl font-bold"
            style={{
              color: lastResult.isCritical
                ? "#d97706"
                : lastResult.isFumble
                ? "#dc2626"
                : "var(--text-primary)",
            }}
          >
            {lastResult.total}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            [{lastResult.rolls.join(", ")}]
            {lastResult.modifier !== 0 &&
              ` ${lastResult.modifier > 0 ? "+" : ""}${lastResult.modifier}`}
            {lastResult.advantage !== "normal" &&
              ` (${lastResult.advantage})`}
          </p>
        </div>
      )}

      {/* Roll History */}
      {rollHistory.length > 0 && (
        <div className="flex flex-col gap-1">
          <p
            className="text-xs font-medium uppercase tracking-wider mb-1"
            style={{ color: "var(--text-muted)" }}
          >
            History
          </p>
          <div className="flex flex-col gap-1 max-h-44 overflow-y-auto">
            {rollHistory.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between px-3 py-1.5 rounded-md text-xs"
                style={{
                  backgroundColor: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <span style={{ color: "var(--text-muted)" }}>
                  {r.rollerName} · {r.count}d{r.sides}
                  {r.modifier !== 0
                    ? r.modifier > 0
                      ? ` +${r.modifier}`
                      : ` ${r.modifier}`
                    : ""}
                  {r.advantage !== "normal" ? ` (${r.advantage.slice(0, 3)})` : ""}
                </span>
                <span
                  className="font-mono font-bold"
                  style={{
                    color: r.isCritical
                      ? "#d97706"
                      : r.isFumble
                      ? "#dc2626"
                      : "var(--text-primary)",
                  }}
                >
                  {r.total}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
