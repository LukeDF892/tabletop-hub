"use client";

import { useRef, useState, useEffect } from "react";
import type { UnitMarker, RangeIndicator } from "@/lib/wh40k/gameTypes";
import type { TerrainPiece, MapObjective, DeploymentZone } from "@/lib/wh40k/mapPresets";
import { getUnitIcon, getSilhouettePath, silhouetteTypeForUnit, BASE_RADIUS_INCHES } from "@/lib/wh40k/unitSilhouettes";
import { hexPackPositions } from "@/lib/wh40k/hexPack";

// Board: 60" wide × 44" tall. 1 SVG unit = 1 inch.
const BOARD_W = 60;
const BOARD_H = 44;
const INCH_PX = 64;
const MARGIN = 48;
const DEFAULT_ZOOM = 0.25;

const SVG_W = BOARD_W * INCH_PX + MARGIN;
const SVG_H = BOARD_H * INCH_PX + MARGIN;

// Objective physical size in 40k = 40mm ≈ 1.6" radius on board
const OBJ_RADIUS_INCHES = 1.6;

const FACTION_COLORS: Record<string, { p1: string; p2: string }> = {
  "Space Marines":   { p1: "#1e40af", p2: "#1e3a8a" },
  "Dark Angels":     { p1: "#166534", p2: "#14532d" },
  "Blood Angels":    { p1: "#991b1b", p2: "#7f1d1d" },
  "Space Wolves":    { p1: "#1d4ed8", p2: "#1e40af" },
  "Ultramarines":    { p1: "#1d4ed8", p2: "#1e3a8a" },
  "Tyranids":        { p1: "#6b21a8", p2: "#581c87" },
  "Necrons":         { p1: "#374151", p2: "#1f2937" },
  "Chaos Space Marines": { p1: "#7f1d1d", p2: "#450a0a" },
  "Death Guard":     { p1: "#365314", p2: "#1a2e05" },
  "Thousand Sons":   { p1: "#1e3a8a", p2: "#1e1b4b" },
  "Astra Militarum": { p1: "#713f12", p2: "#451a03" },
  "Orks":            { p1: "#166534", p2: "#052e16" },
  "Eldar":           { p1: "#065f46", p2: "#022c22" },
  "Craftworlds":     { p1: "#065f46", p2: "#022c22" },
  "Drukhari":        { p1: "#4c1d95", p2: "#2e1065" },
  "Tau Empire":      { p1: "#164e63", p2: "#083344" },
  "T'au Empire":     { p1: "#164e63", p2: "#083344" },
  "Adeptus Mechanicus": { p1: "#7f1d1d", p2: "#450a0a" },
};

function getFactionColor(faction: string, player: "p1" | "p2"): string {
  const entry = FACTION_COLORS[faction];
  if (entry) return entry[player];
  // Fuzzy fallback: match substring
  for (const [key, val] of Object.entries(FACTION_COLORS)) {
    if (faction.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(faction.toLowerCase())) {
      return val[player];
    }
  }
  return player === "p1" ? "#dc2626" : "#2563eb";
}

function getUnitAbbr(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return name.slice(0, 3).toUpperCase();
  return words.slice(0, 3).map((w) => w[0]).join("").toUpperCase();
}

interface TooltipData {
  marker: UnitMarker;
  x: number;
  y: number;
}

export interface Warhammer40kBoardProps {
  markers: UnitMarker[];
  selectedMarkerId: string | null;
  onCellClick: (x: number, y: number) => void;
  onUnitClick: (markerId: string) => void;
  phase: string;
  activePlayer: "P1" | "P2";
  validCells?: Set<string>;
  terrain?: TerrainPiece[];
  objectives?: MapObjective[];
  rangeIndicators?: RangeIndicator[];
  deploymentDepth?: number;
  p1Zone?: DeploymentZone;
  p2Zone?: DeploymentZone;
  objectiveControl?: ('P1' | 'P2' | null)[];
  showMeasurementLine?: boolean;
  actedThisTurn?: string[];
}

export default function Warhammer40kBoard({
  markers,
  selectedMarkerId,
  onCellClick,
  onUnitClick,
  phase,
  validCells,
  terrain = [],
  objectives,
  rangeIndicators = [],
  deploymentDepth = 9,
  p1Zone,
  p2Zone,
  objectiveControl,
  showMeasurementLine = false,
  actedThisTurn = [],
}: Warhammer40kBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panStartRef = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);
  const didDragRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  // Hover position in board inches for distance line
  const [hoverBoardPos, setHoverBoardPos] = useState<{ x: number; y: number } | null>(null);

  const displayedObjectives: MapObjective[] = objectives ?? [
    { x: 30, y: 22 },
    { x: 10, y: 11 },
    { x: 50, y: 11 },
    { x: 10, y: 33 },
    { x: 50, y: 33 },
  ];

  // Compute hover range ring for the hovered unit
  const hoveredMarker = tooltip?.marker;
  const hoverRangeRing = (() => {
    if (!hoveredMarker) return null;
    const cx = (hoveredMarker.x + 0.5) * INCH_PX;
    const cy = (hoveredMarker.y + 0.5) * INCH_PX;
    if (phase === "movement") {
      const m = hoveredMarker.stats.movement.replace(/"/g, "");
      const r = (parseInt(m) || 6) * INCH_PX;
      return { cx, cy, r, color: "#4ade80", label: `${parseInt(m) || 6}"` };
    }
    if (phase === "shooting") {
      const ranged = hoveredMarker.weapons.filter((w) => w.type !== "Melee");
      if (ranged.length === 0) return null;
      const maxRange = Math.max(...ranged.map((w) => {
        const s = w.range?.replace(/"/g, "") ?? "0";
        return parseInt(s) || 0;
      }));
      if (maxRange === 0) return null;
      return { cx, cy, r: maxRange * INCH_PX, color: "#ef4444", label: `${maxRange}"` };
    }
    if (phase === "charge") {
      return { cx, cy, r: 12 * INCH_PX, color: "#facc15", label: `12"` };
    }
    return null;
  })();

  // Compute distance line from selected unit to hover position
  const selectedMarker = selectedMarkerId ? markers.find((m) => m.id === selectedMarkerId) : null;
  const distanceLine = (() => {
    if (!selectedMarker || !hoverBoardPos) return null;
    const ax = (selectedMarker.x + 0.5) * INCH_PX;
    const ay = (selectedMarker.y + 0.5) * INCH_PX;
    const bx = hoverBoardPos.x * INCH_PX;
    const by = hoverBoardPos.y * INCH_PX;
    const dx = hoverBoardPos.x - (selectedMarker.x + 0.5);
    const dy = hoverBoardPos.y - (selectedMarker.y + 0.5);
    const dist = Math.sqrt(dx * dx + dy * dy);
    return { ax, ay, bx, by, dist, midX: (ax + bx) / 2, midY: (ay + by) / 2 };
  })();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const boardDisplayW = SVG_W * DEFAULT_ZOOM;
    const boardDisplayH = SVG_H * DEFAULT_ZOOM;
    setPan({
      x: Math.max(0, (el.clientWidth - boardDisplayW) / 2),
      y: Math.max(0, (el.clientHeight - boardDisplayH) / 2),
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const delta = -e.deltaY * 0.0008;
      setZoom((prev) => {
        const next = Math.max(0.1, Math.min(3, prev + delta));
        const ratio = next / prev;
        setPan((p) => ({
          x: cx - (cx - p.x) * ratio,
          y: cy - (cy - p.y) * ratio,
        }));
        return next;
      });
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  function handleZoomBtn(delta: number) {
    const el = containerRef.current;
    if (!el) return;
    const cx = el.clientWidth / 2;
    const cy = el.clientHeight / 2;
    setZoom((prev) => {
      const next = Math.max(0.1, Math.min(3, prev + delta));
      const ratio = next / prev;
      setPan((p) => ({
        x: cx - (cx - p.x) * ratio,
        y: cy - (cy - p.y) * ratio,
      }));
      return next;
    });
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return;
    panStartRef.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
    didDragRef.current = false;
    setIsDragging(false);
  }

  function handleMouseMove(e: React.MouseEvent) {
    // Update hover position for distance readout
    const el = containerRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      const boardX = (e.clientX - rect.left - pan.x) / zoom - MARGIN;
      const boardY = (e.clientY - rect.top - pan.y) / zoom - MARGIN;
      const inchX = boardX / INCH_PX;
      const inchY = boardY / INCH_PX;
      if (inchX >= 0 && inchX <= BOARD_W && inchY >= 0 && inchY <= BOARD_H) {
        setHoverBoardPos({ x: inchX, y: inchY });
      } else {
        setHoverBoardPos(null);
      }
    }
    // Panning
    if (!panStartRef.current) return;
    const dx = e.clientX - panStartRef.current.mx;
    const dy = e.clientY - panStartRef.current.my;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      didDragRef.current = true;
      setIsDragging(true);
      setPan({ x: panStartRef.current.px + dx, y: panStartRef.current.py + dy });
    }
  }

  function handleMouseUp() {
    panStartRef.current = null;
    setIsDragging(false);
  }

  function handleMouseLeave() {
    panStartRef.current = null;
    setIsDragging(false);
    setHoverBoardPos(null);
  }

  function handleSvgClick(e: React.MouseEvent<SVGSVGElement>) {
    if (didDragRef.current) return;
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const svgX = (e.clientX - rect.left - pan.x) / zoom;
    const svgY = (e.clientY - rect.top - pan.y) / zoom;
    const boardX = svgX - MARGIN;
    const boardY = svgY - MARGIN;
    const cellX = Math.floor(boardX / INCH_PX);
    const cellY = Math.floor(boardY / INCH_PX);
    if (cellX >= 0 && cellX < BOARD_W && cellY >= 0 && cellY < BOARD_H) {
      onCellClick(cellX, cellY);
    }
  }

  // Grid lines
  const gridLines: React.ReactNode[] = [];
  for (let x = 0; x <= BOARD_W; x++) {
    const major = x % 6 === 0;
    gridLines.push(
      <line
        key={`v${x}`}
        x1={x * INCH_PX} y1={0} x2={x * INCH_PX} y2={BOARD_H * INCH_PX}
        stroke={major ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.05)"}
        strokeWidth={major ? 1 : 0.5}
      />
    );
  }
  for (let y = 0; y <= BOARD_H; y++) {
    const major = y % 6 === 0;
    gridLines.push(
      <line
        key={`h${y}`}
        x1={0} y1={y * INCH_PX} x2={BOARD_W * INCH_PX} y2={y * INCH_PX}
        stroke={major ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.05)"}
        strokeWidth={major ? 1 : 0.5}
      />
    );
  }

  const xLabels = [0, 6, 12, 18, 24, 30, 36, 42, 48, 54, 60];
  const yLabels = [0, 6, 12, 18, 24, 30, 36, 42];

  // Filter: only show non-destroyed, non-reserve markers (except attached chars are shown with unit)
  const activeMarkers = markers.filter((m) => !m.isDestroyed && !m.isInReserve);

  return (
    <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column" }}>
      {/* Zoom controls */}
      <div
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          gap: 4,
          backgroundColor: "rgba(0,0,0,0.65)",
          borderRadius: 8,
          padding: "4px 8px",
          border: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        <button
          onClick={() => handleZoomBtn(-0.1)}
          style={{ width: 22, height: 22, borderRadius: 4, border: "1px solid rgba(255,255,255,0.15)", backgroundColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: 14, lineHeight: 1 }}
        >−</button>
        <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, minWidth: 36, textAlign: "center" }}>
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => handleZoomBtn(0.1)}
          style={{ width: 22, height: 22, borderRadius: 4, border: "1px solid rgba(255,255,255,0.15)", backgroundColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: 14, lineHeight: 1 }}
        >+</button>
      </div>

      {/* Board container */}
      <div
        ref={containerRef}
        style={{ flex: 1, overflow: "hidden", position: "relative", cursor: isDragging ? "grabbing" : "grab" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <div
          style={{
            position: "absolute",
            transformOrigin: "0 0",
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          <svg
            width={SVG_W}
            height={SVG_H}
            style={{ display: "block" }}
            onClick={handleSvgClick}
          >
            <defs>
              <radialGradient id="boardFelt" cx="50%" cy="50%" r="70%">
                <stop offset="0%" stopColor="#1e4020" />
                <stop offset="60%" stopColor="#163418" />
                <stop offset="100%" stopColor="#0c2010" />
              </radialGradient>
              {/* Clip paths for unit silhouettes — one per model for multi-model units */}
              {activeMarkers.flatMap((m) => {
                const baseSize = m.baseSize ?? "infantry";
                const r = BASE_RADIUS_INCHES[baseSize] * INCH_PX;
                const isMulti = (m.modelCount ?? 1) > 1;
                if (!isMulti) {
                  const cx = (m.x + 0.5) * INCH_PX;
                  const cy = (m.y + 0.5) * INCH_PX;
                  return [(
                    <clipPath key={`clip-${m.id}`} id={`clip-${m.id}`}>
                      <circle cx={cx} cy={cy} r={r} />
                    </clipPath>
                  )];
                }
                const positions = m.modelPositions ?? hexPackPositions(m.x + 0.5, m.y + 0.5, m.modelCount ?? 1);
                return positions.map((pos, idx) => (
                  <clipPath key={`clip-${m.id}-${idx}`} id={`clip-${m.id}-${idx}`}>
                    <circle cx={pos.x * INCH_PX} cy={pos.y * INCH_PX} r={r} />
                  </clipPath>
                ));
              })}
            </defs>

            <g transform={`translate(${MARGIN}, ${MARGIN})`}>
              {/* Felt background */}
              <rect width={BOARD_W * INCH_PX} height={BOARD_H * INCH_PX} fill="url(#boardFelt)" />

              {/* P2 deployment zone */}
              {p2Zone ? (
                <rect
                  x={p2Zone.x * INCH_PX} y={p2Zone.y * INCH_PX}
                  width={p2Zone.w * INCH_PX} height={p2Zone.h * INCH_PX}
                  fill="rgba(37,99,235,0.15)"
                />
              ) : (
                <rect x={0} y={0} width={BOARD_W * INCH_PX} height={deploymentDepth * INCH_PX} fill="rgba(37,99,235,0.15)" />
              )}
              {/* P1 deployment zone */}
              {p1Zone ? (
                <rect
                  x={p1Zone.x * INCH_PX} y={p1Zone.y * INCH_PX}
                  width={p1Zone.w * INCH_PX} height={p1Zone.h * INCH_PX}
                  fill="rgba(220,38,38,0.15)"
                />
              ) : (
                <rect
                  x={0} y={(BOARD_H - deploymentDepth) * INCH_PX}
                  width={BOARD_W * INCH_PX} height={deploymentDepth * INCH_PX}
                  fill="rgba(220,38,38,0.15)"
                />
              )}

              {/* Grid */}
              {gridLines}

              {/* Valid cell highlights */}
              {validCells && Array.from(validCells).map((key) => {
                const [cx, cy] = key.split(",").map(Number);
                return (
                  <rect
                    key={key}
                    x={cx * INCH_PX} y={cy * INCH_PX}
                    width={INCH_PX} height={INCH_PX}
                    fill="rgba(234,179,8,0.18)"
                    stroke="rgba(234,179,8,0.5)"
                    strokeWidth={1}
                  />
                );
              })}

              {/* Terrain pieces */}
              {terrain.map((t, i) => {
                const tx = t.x * INCH_PX;
                const ty = t.y * INCH_PX;
                const tw = t.w * INCH_PX;
                const th = t.h * INCH_PX;
                return (
                  <g key={`terrain-${i}`}>
                    <rect
                      x={tx} y={ty} width={tw} height={th}
                      fill="rgba(80,70,60,0.75)"
                      stroke="rgba(120,100,80,0.9)"
                      strokeWidth={2}
                    />
                    {/* Ruin texture lines */}
                    <line x1={tx+4} y1={ty+4} x2={tx+tw-4} y2={ty+4} stroke="rgba(160,130,100,0.3)" strokeWidth={1} />
                    <line x1={tx+4} y1={ty+th-4} x2={tx+tw-4} y2={ty+th-4} stroke="rgba(160,130,100,0.3)" strokeWidth={1} />
                    <text
                      x={tx + tw / 2}
                      y={ty + th / 2 + 5}
                      textAnchor="middle"
                      fontSize={14}
                      fill="rgba(200,170,130,0.7)"
                      fontFamily="Georgia, serif"
                      fontStyle="italic"
                    >
                      {t.label}
                    </text>
                  </g>
                );
              })}

              {/* Range indicators (behind units) */}
              {rangeIndicators.map((ri, i) => {
                const cx = ri.centreX * INCH_PX;
                const cy = ri.centreY * INCH_PX;
                const r = ri.radiusInches * INCH_PX;
                return (
                  <g key={`range-${i}`}>
                    <circle
                      cx={cx} cy={cy} r={r}
                      fill={ri.colour}
                      fillOpacity={ri.opacity ?? 0.1}
                      stroke={ri.colour}
                      strokeWidth={2}
                      strokeOpacity={ri.strokeOpacity ?? 0.5}
                    />
                    {ri.label && (
                      <text
                        x={cx}
                        y={cy - r - 6}
                        textAnchor="middle"
                        fontSize={14}
                        fill={ri.colour}
                        fillOpacity={0.8}
                        fontFamily="monospace"
                      >
                        {ri.label}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Hover range ring (shown on unit hover, only when measurement line enabled) */}
              {showMeasurementLine && hoverRangeRing && (
                <g>
                  <circle
                    cx={hoverRangeRing.cx} cy={hoverRangeRing.cy} r={hoverRangeRing.r}
                    fill={hoverRangeRing.color} fillOpacity={0.06}
                    stroke={hoverRangeRing.color} strokeWidth={1.5} strokeOpacity={0.4}
                    strokeDasharray="8 4"
                  />
                  <text
                    x={hoverRangeRing.cx} y={hoverRangeRing.cy - hoverRangeRing.r - 6}
                    textAnchor="middle" fontSize={13} fill={hoverRangeRing.color}
                    fillOpacity={0.7} fontFamily="monospace"
                  >
                    {hoverRangeRing.label}
                  </text>
                </g>
              )}

              {/* Distance line from selected unit to cursor (only when measurement line enabled) */}
              {showMeasurementLine && distanceLine && (
                <g>
                  <line
                    x1={distanceLine.ax} y1={distanceLine.ay}
                    x2={distanceLine.bx} y2={distanceLine.by}
                    stroke="rgba(255,255,255,0.55)" strokeWidth={1.5}
                    strokeDasharray="10 5"
                  />
                  <rect
                    x={distanceLine.midX - 24} y={distanceLine.midY - 10}
                    width={48} height={18} rx={4}
                    fill="rgba(0,0,0,0.7)"
                  />
                  <text
                    x={distanceLine.midX} y={distanceLine.midY + 4}
                    textAnchor="middle" fontSize={12} fill="white" fontFamily="monospace" fontWeight="bold"
                  >
                    {distanceLine.dist.toFixed(1)}&quot;
                  </text>
                </g>
              )}

              {/* Deployment zone labels — positioned at centre of each zone */}
              {p2Zone ? (
                <text
                  x={(p2Zone.x + p2Zone.w / 2) * INCH_PX}
                  y={(p2Zone.y + p2Zone.h / 2) * INCH_PX + 12}
                  textAnchor="middle" fontSize={28} fill="rgba(59,130,246,0.3)"
                  fontFamily="Georgia, serif" fontWeight="bold" letterSpacing={3}
                >P2 DEPLOYMENT ZONE</text>
              ) : (
                <text x={(BOARD_W * INCH_PX) / 2} y={4 * INCH_PX} textAnchor="middle" fontSize={32} fill="rgba(59,130,246,0.35)" fontFamily="Georgia, serif" fontWeight="bold" letterSpacing={4}>
                  P2 DEPLOYMENT ZONE
                </text>
              )}
              {p1Zone ? (
                <text
                  x={(p1Zone.x + p1Zone.w / 2) * INCH_PX}
                  y={(p1Zone.y + p1Zone.h / 2) * INCH_PX + 12}
                  textAnchor="middle" fontSize={28} fill="rgba(220,38,38,0.3)"
                  fontFamily="Georgia, serif" fontWeight="bold" letterSpacing={3}
                >P1 DEPLOYMENT ZONE</text>
              ) : (
                <text x={(BOARD_W * INCH_PX) / 2} y={(BOARD_H - 4.5) * INCH_PX} textAnchor="middle" fontSize={32} fill="rgba(220,38,38,0.35)" fontFamily="Georgia, serif" fontWeight="bold" letterSpacing={4}>
                  P1 DEPLOYMENT ZONE
                </text>
              )}

              {/* Objective markers — 40mm physical = 1.6" radius, 3" capture radius */}
              {displayedObjectives.map((obj, idx) => {
                const cx = obj.x * INCH_PX;
                const cy = obj.y * INCH_PX;
                const r = OBJ_RADIUS_INCHES * INCH_PX;
                const captureR = 3 * INCH_PX; // 3" capture radius ring
                const num = idx + 1;
                const ctrl = objectiveControl ? objectiveControl[idx] : null;
                const ctrlColor = ctrl === "P1" ? "#ef4444" : ctrl === "P2" ? "#3b82f6" : null;
                return (
                  <g key={`obj-${idx}`}>
                    {/* 3" capture radius ring (faint dashed) */}
                    <circle cx={cx} cy={cy} r={captureR} fill="none" stroke="rgba(234,179,8,0.12)" strokeWidth={1.5} strokeDasharray="8 6" />
                    {/* Control ownership ring */}
                    {ctrlColor && (
                      <circle cx={cx} cy={cy} r={r + 10} fill="none" stroke={ctrlColor} strokeWidth={4} opacity={0.7} />
                    )}
                    {/* Outer glow ring */}
                    <circle cx={cx} cy={cy} r={r + 4} fill="none" stroke={ctrlColor ?? "rgba(234,179,8,0.2)"} strokeWidth={3} />
                    {/* Main circle */}
                    <circle cx={cx} cy={cy} r={r} fill={ctrlColor ? `${ctrlColor}22` : "rgba(234,179,8,0.15)"} stroke={ctrlColor ?? "#eab308"} strokeWidth={3} />
                    {/* Inner ring */}
                    <circle cx={cx} cy={cy} r={r * 0.65} fill="rgba(234,179,8,0.08)" stroke="rgba(234,179,8,0.4)" strokeWidth={1.5} />
                    {/* Objective number */}
                    <text x={cx} y={cy - 8} textAnchor="middle" fontSize={36} fontWeight="bold" fill={ctrlColor ?? "#eab308"} fontFamily="Georgia, serif">
                      {num}
                    </text>
                    {/* Small crown/flag icon (triangle) */}
                    <polygon
                      points={`${cx},${cy+14} ${cx-10},${cy+28} ${cx+10},${cy+28}`}
                      fill={ctrlColor ? `${ctrlColor}80` : "rgba(234,179,8,0.5)"}
                    />
                  </g>
                );
              })}

              {/* Engagement range rings — red dashed circle for units within 1" of an enemy */}
              {activeMarkers.map((m) => {
                const isEngaged = activeMarkers.some(
                  (e) =>
                    e.player !== m.player &&
                    Math.sqrt((e.x - m.x) ** 2 + (e.y - m.y) ** 2) <= 1
                );
                if (!isEngaged) return null;
                const baseSize = m.baseSize ?? "infantry";
                const r = BASE_RADIUS_INCHES[baseSize] * INCH_PX;
                const cx = (m.x + 0.5) * INCH_PX;
                const cy = (m.y + 0.5) * INCH_PX;
                return (
                  <circle
                    key={`engage-${m.id}`}
                    cx={cx} cy={cy}
                    r={r + INCH_PX * 0.18}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth={1.5}
                    strokeOpacity={0.7}
                    strokeDasharray="6 4"
                  />
                );
              })}

              {/* Unit markers */}
              {activeMarkers.map((m) => {
                const baseSize = m.baseSize ?? "infantry";
                const r = BASE_RADIUS_INCHES[baseSize] * INCH_PX;
                const isSelected = m.id === selectedMarkerId;
                const hasActed = actedThisTurn.includes(m.id);
                const isP1 = m.player === "P1";
                const playerSide: "p1" | "p2" = isP1 ? "p1" : "p2";
                const factionFill = getFactionColor(m.faction ?? "", playerSide);
                const strokeColor = isSelected ? "#fbbf24" : (isP1 ? "#f87171" : "#60a5fa");
                const isAttachedChar = m.isAttached;

                const kw = (m.keywords ?? []).map((k) => k.toUpperCase());
                const isCharacter = kw.includes("CHARACTER");
                const iconPath = getUnitIcon(m.keywords ?? []);
                const iconScale = (r * 0.82) / 10;

                const maxW = m.woundsPerModel ?? m.maxWounds;
                const hpFrac = m.currentWounds / maxW;
                const hpColor = hpFrac > 0.6 ? "#4ade80" : hpFrac > 0.3 ? "#facc15" : "#f87171";
                const isDamaged = m.currentWounds < maxW;

                // Label: show "+ CharName" if character is attached
                const silType = silhouetteTypeForUnit(m.faction ?? "", baseSize);
                const silPath = getSilhouettePath(silType);
                const silScale = (r * 0.82) / 10;
                const displayName = m.attachedCharacterName
                  ? `${m.unitName} + ${m.attachedCharacterName}`
                  : m.unitName;
                const abbr = getUnitAbbr(m.unitName);
                const woundLabel = `${m.currentWounds}/${maxW}${(m.modelCount ?? 1) > 1 ? ` ×${m.modelCount}` : ""}`;
                const labelFontSize = Math.max(10, Math.min(18, r * 0.28));
                const isMulti = (m.modelCount ?? 1) > 1;

                const handleClick = (e: React.MouseEvent) => {
                  e.stopPropagation();
                  if (!didDragRef.current) onUnitClick(m.id);
                };
                const handleEnter = (e: React.MouseEvent) => {
                  const rect = containerRef.current?.getBoundingClientRect();
                  if (!rect) return;
                  setTooltip({ marker: { ...m, unitName: displayName }, x: e.clientX - rect.left, y: e.clientY - rect.top });
                };

                if (isMulti) {
                  const positions = m.modelPositions ?? hexPackPositions(m.x + 0.5, m.y + 0.5, m.modelCount ?? 1);
                  const cPos = positions[0];
                  const cSvgX = cPos.x * INCH_PX;
                  const cSvgY = cPos.y * INCH_PX;

                  return (
                    <g
                      key={m.id}
                      onClick={handleClick}
                      onMouseEnter={handleEnter}
                      onMouseLeave={() => setTooltip(null)}
                      style={{ cursor: "pointer", opacity: hasActed ? 0.5 : 1 }}
                    >
                      {/* Selection ring around center model */}
                      {isSelected && (
                        <circle cx={cSvgX} cy={cSvgY} r={r + INCH_PX * 0.2} fill="none" stroke="white" strokeWidth={3} opacity={0.9} strokeDasharray="12 6" />
                      )}
                      {/* Attached character indicator ring */}
                      {isAttachedChar && (
                        <circle cx={cSvgX} cy={cSvgY} r={r + 3} fill="none" stroke="#eab308" strokeWidth={2} opacity={0.7} strokeDasharray="6 3" />
                      )}
                      {/* Cohesion lines from center to outer models */}
                      {positions.slice(1).map((pos, i) => (
                        <line
                          key={`coh-${i}`}
                          x1={cSvgX} y1={cSvgY}
                          x2={pos.x * INCH_PX} y2={pos.y * INCH_PX}
                          stroke={strokeColor} strokeWidth={0.8} strokeOpacity={0.3}
                        />
                      ))}
                      {/* Individual model circles */}
                      {positions.map((pos, idx) => {
                        const sx = pos.x * INCH_PX;
                        const sy = pos.y * INCH_PX;
                        return (
                          <g key={`mdl-${idx}`}>
                            <circle cx={sx} cy={sy} r={r} fill={factionFill} stroke={strokeColor} strokeWidth={1.5} />
                            <path
                              d={silPath}
                              fill="rgba(255,255,255,0.22)"
                              transform={`translate(${sx},${sy}) scale(${silScale})`}
                              clipPath={`url(#clip-${m.id}-${idx})`}
                            />
                            {idx === 0 && (
                              <>
                                <text
                                  x={sx} y={sy - (r > 50 ? r * 0.35 : 4)}
                                  textAnchor="middle"
                                  fontSize={Math.max(10, Math.min(20, r * 0.38))}
                                  fontWeight="bold" fill="white" fontFamily="monospace"
                                >
                                  {abbr}
                                </text>
                                <text
                                  x={sx} y={sy + (r > 50 ? r * 0.55 : 14)}
                                  textAnchor="middle"
                                  fontSize={Math.max(8, Math.min(13, r * 0.26))}
                                  fill={hpColor} fontFamily="monospace"
                                >
                                  {m.currentWounds}/{m.woundsPerModel ?? m.maxWounds}W×{m.modelCount}
                                </text>
                                {m.attachedCharacterName && (
                                  <text x={sx + r * 0.6} y={sy - r * 0.6} textAnchor="middle" fontSize={16} fill="#eab308">⚔</text>
                                )}
                              </>
                            )}
                          </g>
                        );
                      })}
                    </g>
                  );
                }

                // Single-model rendering (original)
                const cx = (m.x + 0.5) * INCH_PX;
                const cy = (m.y + 0.5) * INCH_PX;
                return (
                  <g
                    key={m.id}
                    onClick={handleClick}
                    onMouseEnter={handleEnter}
                    onMouseLeave={() => setTooltip(null)}
                    style={{ cursor: "pointer", opacity: hasActed ? 0.5 : 1 }}
                  >
                    {/* Selection ring */}
                    {isSelected && (
                      <circle cx={cx} cy={cy} r={r + INCH_PX * 0.2} fill="none" stroke="#fbbf24" strokeWidth={3} opacity={0.9} strokeDasharray="12 6" />
                    )}

                    {/* Attached character indicator ring */}
                    {isAttachedChar && (
                      <circle cx={cx} cy={cy} r={r + 3} fill="none" stroke="#eab308" strokeWidth={2} opacity={0.7} strokeDasharray="6 3" />
                    )}

                    {/* Battle-shocked indicator */}
                    {m.battleShocked && (
                      <circle cx={cx} cy={cy} r={r + (isSelected ? INCH_PX * 0.2 + 6 : 6)} fill="none" stroke="#a855f7" strokeWidth={1.5} strokeOpacity={0.7} />
                    )}

                    {/* Body circle with faction color */}
                    <circle cx={cx} cy={cy} r={r} fill={factionFill} stroke={strokeColor} strokeWidth={isSelected ? 3 : 2} />

                    {/* Keyword-based silhouette icon */}
                    <path
                      d={iconPath}
                      fill="white"
                      fillOpacity={isDamaged ? 0.65 : 0.82}
                      stroke="none"
                      transform={`translate(${cx},${cy}) scale(${iconScale})`}
                      clipPath={`url(#clip-${m.id})`}
                    />

                    {/* Damage overlay: red tint when hurt */}
                    {isDamaged && (
                      <circle cx={cx} cy={cy} r={r} fill="#ef4444" fillOpacity={0.18} stroke="none" />
                    )}

                    {/* Abbreviation label below circle */}
                    <text
                      x={cx}
                      y={cy + r + labelFontSize + 2}
                      textAnchor="middle"
                      fontSize={labelFontSize}
                      fontWeight="bold"
                      fill="white"
                      fontFamily="monospace"
                      style={{ textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}
                    >
                      {abbr}
                    </text>

                    {/* Wound count — shown below abbr */}
                    <text
                      x={cx}
                      y={cy + r + labelFontSize * 2 + 4}
                      textAnchor="middle"
                      fontSize={Math.max(9, labelFontSize * 0.85)}
                      fill={hpColor}
                      fontFamily="monospace"
                    >
                      {woundLabel}
                    </text>

                    {/* CHARACTER star badge — top-right of token */}
                    {isCharacter && (
                      <text
                        x={cx + r * 0.72}
                        y={cy - r * 0.62}
                        textAnchor="middle"
                        fontSize={Math.max(12, r * 0.32)}
                        fill="#fbbf24"
                      >
                        ★
                      </text>
                    )}

                    {/* Attached-character link icon */}
                    {m.attachedCharacterName && (
                      <text
                        x={cx + r * 0.6}
                        y={cy - r * 0.6}
                        textAnchor="middle"
                        fontSize={16}
                        fill="#eab308"
                      >
                        ⚔
                      </text>
                    )}

                    {/* Destroyed overlay */}
                    {m.isDestroyed && (
                      <line x1={cx - r * 0.7} y1={cy - r * 0.7} x2={cx + r * 0.7} y2={cy + r * 0.7} stroke="#ef4444" strokeWidth={3} />
                    )}
                  </g>
                );
              })}
            </g>

            {/* Axis labels */}
            {xLabels.map((x) => (
              <text key={`lx${x}`} x={MARGIN + x * INCH_PX} y={MARGIN - 10} textAnchor="middle" fontSize={20} fill="rgba(255,255,255,0.35)" fontFamily="monospace">
                {x}
              </text>
            ))}
            {yLabels.map((y) => (
              <text key={`ly${y}`} x={MARGIN - 10} y={MARGIN + y * INCH_PX + 7} textAnchor="end" fontSize={20} fill="rgba(255,255,255,0.35)" fontFamily="monospace">
                {y}
              </text>
            ))}
          </svg>
        </div>

        {/* Hover tooltip */}
        {tooltip && (() => {
          const tm = tooltip.marker;
          const isP1tip = tm.player === "P1";
          const nameColor = isP1tip ? "#f87171" : "#60a5fa";
          const borderColor = isP1tip ? "rgba(220,38,38,0.5)" : "rgba(37,99,235,0.5)";
          const tipKw = (tm.keywords ?? []).map((k) => k.toUpperCase());
          const isChar = tipKw.includes("CHARACTER");
          const maxWTip = tm.woundsPerModel ?? tm.maxWounds;
          const hpFracTip = tm.currentWounds / maxWTip;
          const hpColorTip = hpFracTip > 0.6 ? "#4ade80" : hpFracTip > 0.3 ? "#facc15" : "#f87171";
          const tooltipW = 210;
          const tooltipH = 210;
          return (
            <div
              style={{
                position: "absolute",
                left: Math.min(tooltip.x + 14, (containerRef.current?.clientWidth ?? 400) - tooltipW - 8),
                top: Math.min(tooltip.y + 14, (containerRef.current?.clientHeight ?? 300) - tooltipH - 8),
                zIndex: 20,
                backgroundColor: "rgba(10,10,15,0.97)",
                border: `1px solid ${borderColor}`,
                borderRadius: 8,
                padding: "8px 10px",
                minWidth: tooltipW,
                pointerEvents: "none",
              }}
            >
              {/* Header: name + CHARACTER badge */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 2 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: nameColor, margin: 0, lineHeight: 1.3 }}>
                  {tm.unitName}
                </p>
                {isChar && (
                  <span style={{
                    fontSize: 8, color: "#fbbf24", border: "1px solid #92400e",
                    backgroundColor: "rgba(234,179,8,0.15)", borderRadius: 3,
                    padding: "1px 4px", marginLeft: 6, whiteSpace: "nowrap", flexShrink: 0,
                  }}>
                    ★ Character
                  </span>
                )}
              </div>

              {/* Faction */}
              {tm.faction && (
                <p style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", margin: "0 0 6px" }}>
                  {tm.faction}
                </p>
              )}

              {/* Wounds bar */}
              <div style={{ marginBottom: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.45)", textTransform: "uppercase" }}>Wounds</span>
                  <span style={{ fontSize: 10, color: hpColorTip, fontWeight: 700 }}>
                    {tm.currentWounds}/{maxWTip}{(tm.modelCount ?? 1) > 1 ? ` ×${tm.modelCount}` : ""}
                  </span>
                </div>
                <div style={{ height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.max(0, Math.min(100, hpFracTip * 100))}%`, backgroundColor: hpColorTip, borderRadius: 2, transition: "width 0.2s" }} />
                </div>
              </div>

              {/* Stats grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "2px 4px", marginBottom: 6 }}>
                {([
                  ["M",  tm.stats.movement],
                  ["T",  String(tm.stats.toughness)],
                  ["Sv", tm.stats.save],
                  ["W",  String(maxWTip)],
                  ["Ld", tm.stats.leadership],
                  ["OC", String(tm.battleShocked ? 0 : tm.stats.oc)],
                ] as [string, string][]).map(([label, val]) => (
                  <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <span style={{ fontSize: 8, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>{label}</span>
                    <span style={{ fontSize: 11, color: label === "OC" && tm.battleShocked ? "#a855f7" : "rgba(255,255,255,0.9)", fontWeight: 600 }}>{val}</span>
                  </div>
                ))}
              </div>

              {/* Battle-shocked badge */}
              {tm.battleShocked && (
                <div style={{ fontSize: 9, color: "#a855f7", border: "1px solid #7e22ce", borderRadius: 3, padding: "1px 5px", display: "inline-block", marginBottom: 4 }}>
                  ⚡ Battle-shocked (OC 0)
                </div>
              )}

              {/* Keywords */}
              {(tm.keywords ?? []).length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                  {(tm.keywords ?? []).slice(0, 5).map((kw) => (
                    <span key={kw} style={{
                      fontSize: 8, color: "rgba(255,255,255,0.45)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: 2, padding: "1px 4px",
                    }}>
                      {kw}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
