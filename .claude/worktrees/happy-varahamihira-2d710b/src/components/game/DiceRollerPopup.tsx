"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export type DiceRollType = "hit" | "wound" | "save" | "charge" | "morale";

interface DiceRollRequest {
  rolls: number[];
  type: DiceRollType;
  threshold: number;
  label: string;
  hits: number;
  total: number;
}

const TYPE_COLOURS: Record<DiceRollType, string> = {
  hit:    "#ffffff",
  wound:  "#ef4444",
  save:   "#facc15",
  charge: "#4ade80",
  morale: "#c084fc",
};

const TYPE_BG: Record<DiceRollType, string> = {
  hit:    "rgba(255,255,255,0.12)",
  wound:  "rgba(239,68,68,0.18)",
  save:   "rgba(250,204,21,0.18)",
  charge: "rgba(74,222,128,0.18)",
  morale: "rgba(192,132,252,0.18)",
};

const DOT_POSITIONS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[25, 25], [75, 75]],
  3: [[25, 25], [50, 50], [75, 75]],
  4: [[25, 25], [75, 25], [25, 75], [75, 75]],
  5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
  6: [[25, 20], [75, 20], [25, 50], [75, 50], [25, 80], [75, 80]],
};

function DieFace({ value, colour, bg, spinning }: { value: number; colour: string; bg: string; spinning: boolean }) {
  const dots = DOT_POSITIONS[Math.max(1, Math.min(6, value))] ?? DOT_POSITIONS[1];
  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: bg,
        border: `2px solid ${colour}`,
        position: "relative",
        flexShrink: 0,
        animation: spinning ? "diceSpin 0.8s ease-out" : undefined,
        boxShadow: spinning ? "none" : `0 0 8px ${colour}40`,
      }}
    >
      {spinning ? (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            fontWeight: 700,
            color: colour,
          }}
        >
          ?
        </div>
      ) : (
        dots.map(([x, y], i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: colour,
              left: `${x}%`,
              top: `${y}%`,
              transform: "translate(-50%, -50%)",
            }}
          />
        ))
      )}
    </div>
  );
}

interface DiceRollerPopupProps {
  request: DiceRollRequest | null;
  onDismiss: () => void;
}

export function DiceRollerPopup({ request, onDismiss }: DiceRollerPopupProps) {
  const [spinning, setSpinning] = useState(false);
  const [progress, setProgress] = useState(100);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!request) return;
    setSpinning(true);
    setProgress(100);
    const spinTimer = setTimeout(() => setSpinning(false), 800);

    // progress bar countdown (3s total)
    const start = Date.now();
    const DURATION = 3000;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      setProgress(Math.max(0, 100 - (elapsed / DURATION) * 100));
    }, 50);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      onDismiss();
    }, DURATION);

    return () => {
      clearTimeout(spinTimer);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  if (!request) return null;

  const colour = TYPE_COLOURS[request.type];
  const bg = TYPE_BG[request.type];
  const visible = request.rolls.slice(0, 12);

  return (
    <>
      <style>{`
        @keyframes diceSpin {
          0%   { transform: rotate(0deg) scale(0.7); opacity: 0.4; }
          50%  { transform: rotate(180deg) scale(1.1); opacity: 1; }
          100% { transform: rotate(360deg) scale(1); opacity: 1; }
        }
      `}</style>
      <div
        style={{
          position: "fixed",
          bottom: 80,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9999,
          backgroundColor: "rgba(12,12,18,0.96)",
          border: `1px solid ${colour}50`,
          borderRadius: 16,
          padding: "14px 18px",
          boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 20px ${colour}20`,
          minWidth: 260,
          maxWidth: 480,
        }}
        onClick={onDismiss}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: colour, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            {request.label}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onDismiss(); }}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 0 }}
          >
            ×
          </button>
        </div>

        {/* Dice row */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10, maxHeight: 82, overflowY: visible.length > 6 ? "auto" : "hidden" }}>
          {visible.map((v, i) => (
            <DieFace key={i} value={v} colour={colour} bg={bg} spinning={spinning} />
          ))}
          {request.rolls.length > 12 && (
            <div style={{ alignSelf: "center", fontSize: 10, color: "rgba(255,255,255,0.45)" }}>
              +{request.rolls.length - 12} more
            </div>
          )}
        </div>

        {/* Outcome */}
        {!spinning && (
          <div style={{ fontSize: 13, fontWeight: 700, color: colour, marginBottom: 8 }}>
            {request.hits}/{request.total} {request.label.toLowerCase().includes("wound") ? "wounds" : request.label.toLowerCase().includes("save") ? "failed saves" : "successes"}
          </div>
        )}

        {/* Progress bar */}
        <div style={{ height: 2, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 1, overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              backgroundColor: colour,
              borderRadius: 1,
              transition: "width 50ms linear",
            }}
          />
        </div>
      </div>
    </>
  );
}

export function useDiceRoller() {
  const [request, setRequest] = useState<DiceRollRequest | null>(null);

  const showRoll = useCallback((params: {
    rolls: number[];
    type: DiceRollType;
    threshold: number;
    label: string;
  }) => {
    const hits = params.rolls.filter((r) => r >= params.threshold).length;
    setRequest({ ...params, hits, total: params.rolls.length });
  }, []);

  const dismiss = useCallback(() => setRequest(null), []);

  return { request, showRoll, dismiss };
}
