"use client";

import { useRef, useState, useEffect } from "react";
import type { UnitMarker, RangeIndicator } from "@/lib/wh40k/gameTypes";
import type { TerrainPiece, MapObjective, DeploymentZone } from "@/lib/wh40k/mapPresets";
import { getSilhouettePath, silhouetteTypeForUnit, BASE_RADIUS_INCHES } from "@/lib/wh40k/unitSilhouettes";

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
              {/* Clip path for unit silhouettes — one per marker id */}
              {activeMarkers.map((m) => {
                const r = BASE_RADIUS_INCHES[m.baseSize ?? "infantry"] * INCH_PX;
                const cx = (m.x + 0.5) * INCH_PX;
                const cy = (m.y + 0.5) * INCH_PX;
                return (
                  <clipPath key={`clip-${m.id}`} id={`clip-${m.id}`}>
                    <circle cx={cx} cy={cy} r={r} />
                  </clipPath>
                );
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
                const cx = (m.x + 0.5) * INCH_PX;
                const cy = (m.y + 0.5) * INCH_PX;
                const isSelected = m.id === selectedMarkerId;
                const hasActed = actedThisTurn.includes(m.id);
                const isP1 = m.player === "P1";
                const fillColor = isP1 ? "rgba(220,38,38,0.88)" : "rgba(37,99,235,0.88)";
                const strokeColor = isP1 ? "#f87171" : "#60a5fa";
                const hpFrac = m.currentWounds / (m.woundsPerModel ?? m.maxWounds);
                const hpColor = hpFrac > 0.6 ? "#4ade80" : hpFrac > 0.3 ? "#facc15" : "#f87171";
                const isAttachedChar = m.isAttached;

                // Pick silhouette
                const silType = silhouetteTypeForUnit(m.faction ?? "", baseSize);
                const silPath = getSilhouettePath(silType);

                // Scale silhouette to fit inside the circle (normalized [-10,10] → r*0.85)
                const silScale = (r * 0.82) / 10;

                // Label: show "+ CharName" if character is attached
                const displayName = m.attachedCharacterName
                  ? `${m.unitName} + ${m.attachedCharacterName}`
                  : m.unitName;
                const abbr = getUnitAbbr(m.unitName);

                return (
                  <g
                    key={m.id}
                    onClick={(e) => { e.stopPropagation(); if (!didDragRef.current) onUnitClick(m.id); }}
                    onMouseEnter={(e) => {
                      const rect = containerRef.current?.getBoundingClientRect();
                      if (!rect) return;
                      setTooltip({ marker: { ...m, unitName: displayName }, x: e.clientX - rect.left, y: e.clientY - rect.top });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    style={{ cursor: "pointer", opacity: hasActed ? 0.5 : 1 }}
                  >
                    {/* Selection ring */}
                    {isSelected && (
                      <circle cx={cx} cy={cy} r={r + INCH_PX * 0.2} fill="none" stroke="white" strokeWidth={3} opacity={0.9} strokeDasharray="12 6" />
                    )}

                    {/* Attached character indicator ring */}
                    {isAttachedChar && (
                      <circle cx={cx} cy={cy} r={r + 3} fill="none" stroke="#eab308" strokeWidth={2} opacity={0.7} strokeDasharray="6 3" />
                    )}

                    {/* Body circle */}
                    <circle cx={cx} cy={cy} r={r} fill={fillColor} stroke={strokeColor} strokeWidth={2.5} />

                    {/* Silhouette (clipped to circle) */}
                    <path
                      d={silPath}
                      fill="rgba(255,255,255,0.22)"
                      transform={`translate(${cx},${cy}) scale(${silScale})`}
                      clipPath={`url(#clip-${m.id})`}
                    />

                    {/* Abbreviation (small, above centre for large bases) */}
                    <text
                      x={cx}
                      y={cy - (r > 50 ? r * 0.35 : 4)}
                      textAnchor="middle"
                      fontSize={Math.max(14, Math.min(26, r * 0.38))}
                      fontWeight="bold"
                      fill="white"
                      fontFamily="monospace"
                    >
                      {abbr}
                    </text>

                    {/* Wound count */}
                    <text
                      x={cx}
                      y={cy + (r > 50 ? r * 0.55 : 18)}
                      textAnchor="middle"
                      fontSize={Math.max(11, Math.min(18, r * 0.26))}
                      fill={hpColor}
                      fontFamily="monospace"
                    >
                      {m.currentWounds}/{m.woundsPerModel ?? m.maxWounds}W{(m.modelCount ?? 1) > 1 ? ` ×${m.modelCount}` : ""}
                    </text>

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
        {tooltip && (
          <div
            style={{
              position: "absolute",
              left: Math.min(tooltip.x + 12, (containerRef.current?.clientWidth ?? 400) - 210),
              top: Math.min(tooltip.y + 12, (containerRef.current?.clientHeight ?? 300) - 190),
              zIndex: 20,
              backgroundColor: "rgba(15,15,20,0.95)",
              border: `1px solid ${tooltip.marker.player === "P1" ? "rgba(220,38,38,0.5)" : "rgba(37,99,235,0.5)"}`,
              borderRadius: 8,
              padding: "8px 10px",
              minWidth: 190,
              pointerEvents: "none",
            }}
          >
            <p style={{ fontSize: 11, fontWeight: 700, color: tooltip.marker.player === "P1" ? "#f87171" : "#60a5fa", marginBottom: 4 }}>
              {tooltip.marker.unitName}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "2px 8px" }}>
              {[
                ["M",  tooltip.marker.stats.movement],
                ["T",  String(tooltip.marker.stats.toughness)],
                ["Sv", tooltip.marker.stats.save],
                ["W",  `${tooltip.marker.currentWounds}/${tooltip.marker.woundsPerModel ?? tooltip.marker.maxWounds}${(tooltip.marker.modelCount ?? 1) > 1 ? ` ×${tooltip.marker.modelCount}` : ""}`],
                ["Ld", tooltip.marker.stats.leadership],
                ["OC", String(tooltip.marker.stats.oc)],
              ].map(([label, val]) => (
                <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.45)", textTransform: "uppercase" }}>{label}</span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.9)", fontWeight: 600 }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
