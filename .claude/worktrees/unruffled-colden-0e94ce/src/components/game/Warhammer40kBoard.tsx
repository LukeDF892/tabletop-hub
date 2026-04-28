"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import type { DeployedUnit, ObjectiveMarker } from "@/lib/wh40k/gameTypes";

// ── Board constants ─────────────────────────────────────────────────────────
const CELL = 20;           // px per inch at 1× zoom
const BOARD_W = 60;        // inches wide
const BOARD_H = 44;        // inches tall
const PX_W = BOARD_W * CELL;  // 1200 px
const PX_H = BOARD_H * CELL;  // 880 px
const P1_DEPLOY_Y = 35;   // bottom 9" → rows 35-43
const P2_DEPLOY_Y = 9;    // top 9"    → rows 0-8

export const DEFAULT_OBJECTIVES: ObjectiveMarker[] = [
  { id: 1, x: 10, y: 7,  controlled: null },
  { id: 2, x: 50, y: 7,  controlled: null },
  { id: 3, x: 10, y: 22, controlled: null },
  { id: 4, x: 50, y: 22, controlled: null },
  { id: 5, x: 10, y: 37, controlled: null },
  { id: 6, x: 50, y: 37, controlled: null },
];

// ── Props ───────────────────────────────────────────────────────────────────
interface Props {
  deployedUnits: DeployedUnit[];
  objectives: ObjectiveMarker[];
  gamePhase: string;
  roundPhase: string;
  selectedUnitId: string | null;
  deployingInstanceId: string | null;
  activePlayer: "P1" | "P2";
  onUnitClick: (instanceId: string) => void;
  onBoardClick: (x: number, y: number) => void;
  onObjectiveClick: (id: number) => void;
}

// ── Component ───────────────────────────────────────────────────────────────
export default function Warhammer40kBoard({
  deployedUnits,
  objectives,
  gamePhase,
  roundPhase,
  selectedUnitId,
  deployingInstanceId,
  activePlayer,
  onUnitClick,
  onBoardClick,
  onObjectiveClick,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.35);
  const [pan, setPan] = useState({ x: 20, y: 20 });
  const [hoveredUnit, setHoveredUnit] = useState<string | null>(null);

  const dragRef = useRef<{ active: boolean; mx: number; my: number; px: number; py: number }>({
    active: false, mx: 0, my: 0, px: 0, py: 0,
  });

  // ── Zoom with mouse wheel ─────────────────────────────────────────────────
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    setZoom((z) => Math.max(0.1, Math.min(3, z * factor)));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  // ── Pan (mouse drag) ──────────────────────────────────────────────────────
  function onMouseDown(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    if (target.closest("[data-unit-marker]") || target.closest("[data-objective]")) return;
    if (e.button !== 0) return;
    dragRef.current = { active: true, mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!dragRef.current.active) return;
    setPan({
      x: dragRef.current.px + (e.clientX - dragRef.current.mx),
      y: dragRef.current.py + (e.clientY - dragRef.current.my),
    });
  }

  function onMouseUp(e: React.MouseEvent) {
    if (!dragRef.current.active) return;
    const dx = Math.abs(e.clientX - dragRef.current.mx);
    const dy = Math.abs(e.clientY - dragRef.current.my);
    dragRef.current.active = false;

    // Treat as click if barely moved
    if (dx < 5 && dy < 5) {
      const target = e.target as HTMLElement;
      if (target.closest("[data-unit-marker]") || target.closest("[data-objective]")) return;
      const rect = containerRef.current!.getBoundingClientRect();
      const bx = (e.clientX - rect.left - pan.x) / zoom;
      const by = (e.clientY - rect.top - pan.y) / zoom;
      const ix = Math.floor(bx / CELL);
      const iy = Math.floor(by / CELL);
      if (ix >= 0 && ix < BOARD_W && iy >= 0 && iy < BOARD_H) {
        onBoardClick(ix, iy);
      }
    }
  }

  // ── Grid lines (SVG) ──────────────────────────────────────────────────────
  const gridLines: React.ReactElement[] = [];
  for (let x = 0; x <= BOARD_W; x++) {
    const isMajor = x % 6 === 0;
    gridLines.push(
      <line
        key={`v${x}`}
        x1={x * CELL} y1={0} x2={x * CELL} y2={PX_H}
        stroke={isMajor ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.06)"}
        strokeWidth={isMajor ? 1 : 0.5}
      />
    );
  }
  for (let y = 0; y <= BOARD_H; y++) {
    const isMajor = y % 6 === 0;
    gridLines.push(
      <line
        key={`h${y}`}
        x1={0} y1={y * CELL} x2={PX_W} y2={y * CELL}
        stroke={isMajor ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.06)"}
        strokeWidth={isMajor ? 1 : 0.5}
      />
    );
  }

  // Ruler label ticks (every 6")
  const xLabels: React.ReactElement[] = [];
  const yLabels: React.ReactElement[] = [];
  for (let x = 0; x <= BOARD_W; x += 6) {
    xLabels.push(
      <text key={`xl${x}`} x={x * CELL} y={11} textAnchor="middle"
        fontSize={9} fill="rgba(255,255,255,0.35)" fontFamily="monospace">
        {x}"
      </text>
    );
  }
  for (let y = 0; y <= BOARD_H; y += 6) {
    yLabels.push(
      <text key={`yl${y}`} x={-6} y={y * CELL + 4} textAnchor="end"
        fontSize={9} fill="rgba(255,255,255,0.35)" fontFamily="monospace">
        {y}"
      </text>
    );
  }

  // ── Hover tooltip ─────────────────────────────────────────────────────────
  const hoveredUnitData = hoveredUnit
    ? deployedUnits.find((u) => u.instanceId === hoveredUnit)
    : null;

  return (
    <div
      style={{ position: "relative", flex: 1, overflow: "hidden", backgroundColor: "#0a0a12" }}
    >
      {/* Zoom controls */}
      <div
        style={{
          position: "absolute", top: 8, right: 8, zIndex: 20,
          display: "flex", flexDirection: "column", gap: 4,
        }}
      >
        <button
          onClick={() => setZoom((z) => Math.min(3, z * 1.2))}
          style={zoomBtnStyle}
          title="Zoom in"
        >+</button>
        <span
          style={{
            textAlign: "center", fontSize: 10, color: "rgba(255,255,255,0.4)",
            fontFamily: "monospace",
          }}
        >
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom((z) => Math.max(0.1, z * 0.83))}
          style={zoomBtnStyle}
          title="Zoom out"
        >−</button>
        <button
          onClick={() => { setZoom(0.35); setPan({ x: 20, y: 20 }); }}
          style={{ ...zoomBtnStyle, fontSize: 9, padding: "3px 4px" }}
          title="Reset view"
        >⟳</button>
      </div>

      {/* Panning / clickable surface */}
      <div
        ref={containerRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={() => { dragRef.current.active = false; }}
        style={{ width: "100%", height: "100%", cursor: dragRef.current.active ? "grabbing" : "crosshair" }}
      >
        {/* Transform wrapper */}
        <div
          style={{
            position: "absolute",
            transformOrigin: "0 0",
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            willChange: "transform",
          }}
        >
          {/* Board surface */}
          <div
            style={{
              position: "relative",
              width: PX_W,
              height: PX_H,
              background: [
                "radial-gradient(ellipse 80% 60% at 50% 50%, #1a2e1a 0%, #0e1a0e 60%, #0a120a 100%)",
                "radial-gradient(circle at 20% 30%, rgba(139,90,43,0.12) 0%, transparent 50%)",
                "radial-gradient(circle at 80% 70%, rgba(100,60,20,0.10) 0%, transparent 50%)",
              ].join(", "),
              boxShadow: "inset 0 0 60px rgba(0,0,0,0.6)",
            }}
          >
            {/* SVG grid + labels */}
            <svg
              style={{ position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none" }}
              width={PX_W}
              height={PX_H}
            >
              {gridLines}
              {xLabels}
              {yLabels}
            </svg>

            {/* P2 deployment zone (top 9") */}
            <div
              style={{
                position: "absolute", left: 0, top: 0,
                width: PX_W, height: P2_DEPLOY_Y * CELL,
                backgroundColor: "rgba(59,130,246,0.10)",
                borderBottom: "1px dashed rgba(59,130,246,0.35)",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "absolute", left: 4, top: 4,
                fontSize: 10, color: "rgba(59,130,246,0.5)",
                fontFamily: "monospace", pointerEvents: "none", userSelect: "none",
              }}
            >
              P2 DEPLOYMENT
            </div>

            {/* P1 deployment zone (bottom 9") */}
            <div
              style={{
                position: "absolute", left: 0, top: P1_DEPLOY_Y * CELL,
                width: PX_W, height: (BOARD_H - P1_DEPLOY_Y) * CELL,
                backgroundColor: "rgba(220,38,38,0.10)",
                borderTop: "1px dashed rgba(220,38,38,0.35)",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "absolute", left: 4, top: P1_DEPLOY_Y * CELL + 4,
                fontSize: 10, color: "rgba(220,38,38,0.5)",
                fontFamily: "monospace", pointerEvents: "none", userSelect: "none",
              }}
            >
              P1 DEPLOYMENT
            </div>

            {/* Objective markers */}
            {objectives.map((obj) => {
              const cx = obj.x * CELL;
              const cy = obj.y * CELL;
              const controlled = obj.controlled;
              return (
                <button
                  key={obj.id}
                  data-objective="true"
                  onClick={() => onObjectiveClick(obj.id)}
                  style={{
                    position: "absolute",
                    left: cx - 16,
                    top: cy - 16,
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    backgroundColor:
                      controlled === "P1"
                        ? "rgba(220,38,38,0.5)"
                        : controlled === "P2"
                        ? "rgba(59,130,246,0.5)"
                        : "rgba(217,119,6,0.25)",
                    border: `2px solid ${
                      controlled === "P1"
                        ? "#dc2626"
                        : controlled === "P2"
                        ? "#3b82f6"
                        : "rgba(217,119,6,0.7)"
                    }`,
                    color: "white",
                    fontSize: 12,
                    fontWeight: 700,
                    fontFamily: "var(--font-cinzel, serif)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: `0 0 8px ${
                      controlled === "P1"
                        ? "rgba(220,38,38,0.4)"
                        : controlled === "P2"
                        ? "rgba(59,130,246,0.4)"
                        : "rgba(217,119,6,0.3)"
                    }`,
                    zIndex: 5,
                  }}
                >
                  {obj.id}
                </button>
              );
            })}

            {/* Placement cursor: highlight valid destination */}
            {deployingInstanceId && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  zIndex: 2,
                  border: "2px solid rgba(234,179,8,0.5)",
                }}
              />
            )}

            {/* Unit markers */}
            {deployedUnits
              .filter((u) => !u.status.destroyed && !u.status.inReserve)
              .map((unit) => {
                const isSelected = selectedUnitId === unit.instanceId;
                const isHovered = hoveredUnit === unit.instanceId;
                const isDeploying = deployingInstanceId === unit.instanceId;
                const p1Color = "#dc2626";
                const p2Color = "#3b82f6";
                const color = unit.player === "P1" ? p1Color : p2Color;
                const bgAlpha = isSelected ? "0.85" : "0.65";
                const size = 40;

                return (
                  <div
                    key={unit.instanceId}
                    data-unit-marker="true"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUnitClick(unit.instanceId);
                    }}
                    onMouseEnter={() => setHoveredUnit(unit.instanceId)}
                    onMouseLeave={() => setHoveredUnit(null)}
                    style={{
                      position: "absolute",
                      left: unit.x * CELL - size / 2,
                      top: unit.y * CELL - size / 2,
                      width: size,
                      height: size,
                      zIndex: isSelected || isHovered ? 15 : 8,
                      cursor: "pointer",
                    }}
                  >
                    {/* Ring glow for selected/active */}
                    {(isSelected || isDeploying) && (
                      <div
                        style={{
                          position: "absolute",
                          inset: -4,
                          borderRadius: "50%",
                          border: `2px solid ${color}`,
                          boxShadow: `0 0 10px ${color}`,
                          animation: "pulse 1.5s ease-in-out infinite",
                          pointerEvents: "none",
                        }}
                      />
                    )}

                    {/* Circle body */}
                    <div
                      style={{
                        width: size,
                        height: size,
                        borderRadius: "50%",
                        backgroundColor: `rgba(${unit.player === "P1" ? "220,38,38" : "59,130,246"},${bgAlpha})`,
                        border: `2px solid ${color}`,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 0,
                        boxShadow: isSelected
                          ? `0 0 12px ${color}`
                          : `0 2px 6px rgba(0,0,0,0.6)`,
                        transition: "box-shadow 0.15s",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          color: "#fff",
                          letterSpacing: "0.5px",
                          lineHeight: 1,
                          textTransform: "uppercase",
                        }}
                      >
                        {unit.abbrev}
                      </span>
                      <span
                        style={{
                          fontSize: 8,
                          color:
                            unit.currentWounds <= Math.ceil(unit.maxWounds / 3)
                              ? "#f87171"
                              : "rgba(255,255,255,0.75)",
                          lineHeight: 1,
                          marginTop: 1,
                        }}
                      >
                        {unit.currentWounds}/{unit.maxWounds}
                      </span>
                    </div>

                    {/* Status icons */}
                    {unit.status.advanced && (
                      <span
                        style={{ position: "absolute", top: -8, right: -6, fontSize: 11 }}
                        title="Advanced"
                      >🏃</span>
                    )}
                    {unit.status.inMelee && (
                      <span
                        style={{ position: "absolute", top: -8, left: -6, fontSize: 11 }}
                        title="In melee"
                      >⚔️</span>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Unit tooltip (rendered outside transform so it stays readable) */}
      {hoveredUnitData && (
        <div
          style={{
            position: "absolute",
            bottom: 8,
            left: 8,
            zIndex: 30,
            backgroundColor: "rgba(10,10,24,0.95)",
            border: `1px solid ${hoveredUnitData.player === "P1" ? "rgba(220,38,38,0.5)" : "rgba(59,130,246,0.5)"}`,
            borderRadius: 8,
            padding: "8px 12px",
            pointerEvents: "none",
            minWidth: 200,
            maxWidth: 280,
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: hoveredUnitData.player === "P1" ? "#f87171" : "#93c5fd",
              marginBottom: 4,
            }}
          >
            {hoveredUnitData.name}
          </p>
          <div style={{ display: "flex", gap: 8, fontSize: 10, color: "rgba(255,255,255,0.7)", marginBottom: 4 }}>
            <span>M{hoveredUnitData.movement}"</span>
            <span>T{hoveredUnitData.toughness}</span>
            <span>Sv{hoveredUnitData.save}</span>
            <span>W{hoveredUnitData.currentWounds}/{hoveredUnitData.maxWounds}</span>
            <span>Ld{hoveredUnitData.leadership}</span>
            <span>OC{hoveredUnitData.oc}</span>
          </div>
          {hoveredUnitData.keywords.length > 0 && (
            <p style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", fontStyle: "italic" }}>
              {hoveredUnitData.keywords.slice(0, 5).join(", ")}
            </p>
          )}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}

// ── Shared button style ───────────────────────────────────────────────────────
const zoomBtnStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 6,
  backgroundColor: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.15)",
  color: "rgba(255,255,255,0.7)",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
