"use client";

import { useRef, useState, useEffect } from "react";
import type { UnitMarker } from "@/lib/wh40k/gameTypes";

// Board: 60" wide × 44" tall. 1 SVG unit = 1 inch. Pixels per inch in SVG space.
const BOARD_W = 60;
const BOARD_H = 44;
const INCH_PX = 64;
const MARGIN = 48; // space for axis labels
const DEFAULT_ZOOM = 0.25;

const SVG_W = BOARD_W * INCH_PX + MARGIN;
const SVG_H = BOARD_H * INCH_PX + MARGIN;

// Objectives: x = left-right (0-60), y = top-bottom (0-44)
const OBJECTIVES = [
  { id: 1, x: 10, y: 7 },
  { id: 2, x: 50, y: 7 },
  { id: 3, x: 10, y: 22 },
  { id: 4, x: 50, y: 22 },
  { id: 5, x: 10, y: 37 },
  { id: 6, x: 50, y: 37 },
];

function getUnitAbbr(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return name.slice(0, 3).toUpperCase();
  return words
    .slice(0, 3)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
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
  validCells?: Set<string>; // "x,y" cells highlighted as valid targets
}

export default function Warhammer40kBoard({
  markers,
  selectedMarkerId,
  onCellClick,
  onUnitClick,
  validCells,
}: Warhammer40kBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panStartRef = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);
  const didDragRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  // Center board on first render
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

  // Non-passive wheel listener for zoom
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

  function handleSvgClick(e: React.MouseEvent<SVGSVGElement>) {
    if (didDragRef.current) return;
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    // Convert screen coords → board inch coords
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

  // Build grid lines
  const gridLines: React.ReactNode[] = [];
  for (let x = 0; x <= BOARD_W; x++) {
    const major = x % 6 === 0;
    gridLines.push(
      <line
        key={`v${x}`}
        x1={x * INCH_PX}
        y1={0}
        x2={x * INCH_PX}
        y2={BOARD_H * INCH_PX}
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
        x1={0}
        y1={y * INCH_PX}
        x2={BOARD_W * INCH_PX}
        y2={y * INCH_PX}
        stroke={major ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.05)"}
        strokeWidth={major ? 1 : 0.5}
      />
    );
  }

  const xLabels = [0, 6, 12, 18, 24, 30, 36, 42, 48, 54, 60];
  const yLabels = [0, 6, 12, 18, 24, 30, 36, 42];

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
          style={{
            width: 22,
            height: 22,
            borderRadius: 4,
            border: "1px solid rgba(255,255,255,0.15)",
            backgroundColor: "rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.7)",
            cursor: "pointer",
            fontSize: 14,
            lineHeight: 1,
          }}
        >
          −
        </button>
        <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, minWidth: 36, textAlign: "center" }}>
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => handleZoomBtn(0.1)}
          style={{
            width: 22,
            height: 22,
            borderRadius: 4,
            border: "1px solid rgba(255,255,255,0.15)",
            backgroundColor: "rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.7)",
            cursor: "pointer",
            fontSize: 14,
            lineHeight: 1,
          }}
        >
          +
        </button>
      </div>

      {/* Board container */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflow: "hidden",
          position: "relative",
          cursor: isDragging ? "grabbing" : "grab",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
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
            </defs>

            {/* Board background inside margin */}
            <g transform={`translate(${MARGIN}, ${MARGIN})`}>
              {/* Felt background */}
              <rect
                width={BOARD_W * INCH_PX}
                height={BOARD_H * INCH_PX}
                fill="url(#boardFelt)"
              />

              {/* P2 deployment zone — top 9" */}
              <rect
                x={0}
                y={0}
                width={BOARD_W * INCH_PX}
                height={9 * INCH_PX}
                fill="rgba(37,99,235,0.15)"
              />
              {/* P1 deployment zone — bottom 9" */}
              <rect
                x={0}
                y={(BOARD_H - 9) * INCH_PX}
                width={BOARD_W * INCH_PX}
                height={9 * INCH_PX}
                fill="rgba(220,38,38,0.15)"
              />

              {/* Grid */}
              {gridLines}

              {/* Valid cell highlights */}
              {validCells &&
                Array.from(validCells).map((key) => {
                  const [cx, cy] = key.split(",").map(Number);
                  return (
                    <rect
                      key={key}
                      x={cx * INCH_PX}
                      y={cy * INCH_PX}
                      width={INCH_PX}
                      height={INCH_PX}
                      fill="rgba(234,179,8,0.18)"
                      stroke="rgba(234,179,8,0.5)"
                      strokeWidth={1}
                    />
                  );
                })}

              {/* Deployment zone labels */}
              <text
                x={(BOARD_W * INCH_PX) / 2}
                y={4 * INCH_PX}
                textAnchor="middle"
                fontSize={32}
                fill="rgba(59,130,246,0.35)"
                fontFamily="Georgia, serif"
                fontWeight="bold"
                letterSpacing={4}
              >
                P2 DEPLOYMENT ZONE
              </text>
              <text
                x={(BOARD_W * INCH_PX) / 2}
                y={(BOARD_H - 4.5) * INCH_PX}
                textAnchor="middle"
                fontSize={32}
                fill="rgba(220,38,38,0.35)"
                fontFamily="Georgia, serif"
                fontWeight="bold"
                letterSpacing={4}
              >
                P1 DEPLOYMENT ZONE
              </text>

              {/* Objective markers */}
              {OBJECTIVES.map((obj) => {
                const cx = (obj.x + 0.5) * INCH_PX;
                const cy = (obj.y + 0.5) * INCH_PX;
                return (
                  <g key={obj.id}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={INCH_PX * 0.52}
                      fill="rgba(234,179,8,0.18)"
                      stroke="#eab308"
                      strokeWidth={2.5}
                    />
                    <circle
                      cx={cx}
                      cy={cy}
                      r={INCH_PX * 0.35}
                      fill="rgba(234,179,8,0.08)"
                      stroke="rgba(234,179,8,0.4)"
                      strokeWidth={1}
                    />
                    <text
                      x={cx}
                      y={cy + 9}
                      textAnchor="middle"
                      fontSize={26}
                      fontWeight="bold"
                      fill="#eab308"
                      fontFamily="Georgia, serif"
                    >
                      {obj.id}
                    </text>
                  </g>
                );
              })}

              {/* Unit markers */}
              {activeMarkers.map((m) => {
                const cx = (m.x + 0.5) * INCH_PX;
                const cy = (m.y + 0.5) * INCH_PX;
                const isSelected = m.id === selectedMarkerId;
                const isP1 = m.player === "P1";
                const fillColor = isP1 ? "rgba(220,38,38,0.88)" : "rgba(37,99,235,0.88)";
                const strokeColor = isP1 ? "#f87171" : "#60a5fa";
                const abbr = getUnitAbbr(m.unitName);
                const hpFrac = m.currentWounds / m.maxWounds;
                const hpColor = hpFrac > 0.6 ? "#4ade80" : hpFrac > 0.3 ? "#facc15" : "#f87171";

                return (
                  <g
                    key={m.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!didDragRef.current) onUnitClick(m.id);
                    }}
                    onMouseEnter={(e) => {
                      const rect = containerRef.current?.getBoundingClientRect();
                      if (!rect) return;
                      setTooltip({
                        marker: m,
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top,
                      });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    style={{ cursor: "pointer" }}
                  >
                    {/* Selection ring */}
                    {isSelected && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={INCH_PX * 0.82}
                        fill="none"
                        stroke="white"
                        strokeWidth={4}
                        opacity={0.9}
                        strokeDasharray="12 6"
                      />
                    )}
                    {/* Body */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={INCH_PX * 0.6}
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={2.5}
                    />
                    {/* Abbreviation */}
                    <text
                      x={cx}
                      y={cy - 6}
                      textAnchor="middle"
                      fontSize={22}
                      fontWeight="bold"
                      fill="white"
                      fontFamily="monospace"
                    >
                      {abbr}
                    </text>
                    {/* Wound count */}
                    <text
                      x={cx}
                      y={cy + 18}
                      textAnchor="middle"
                      fontSize={16}
                      fill={hpColor}
                      fontFamily="monospace"
                    >
                      {m.currentWounds}W
                    </text>
                    {/* Destroyed overlay */}
                    {m.isDestroyed && (
                      <line
                        x1={cx - 28}
                        y1={cy - 28}
                        x2={cx + 28}
                        y2={cy + 28}
                        stroke="#ef4444"
                        strokeWidth={3}
                      />
                    )}
                  </g>
                );
              })}
            </g>

            {/* Axis labels — top (x = 0..60 every 6) */}
            {xLabels.map((x) => (
              <text
                key={`lx${x}`}
                x={MARGIN + x * INCH_PX}
                y={MARGIN - 10}
                textAnchor="middle"
                fontSize={20}
                fill="rgba(255,255,255,0.35)"
                fontFamily="monospace"
              >
                {x}
              </text>
            ))}

            {/* Axis labels — left (y = 0..44 every 6) */}
            {yLabels.map((y) => (
              <text
                key={`ly${y}`}
                x={MARGIN - 10}
                y={MARGIN + y * INCH_PX + 7}
                textAnchor="end"
                fontSize={20}
                fill="rgba(255,255,255,0.35)"
                fontFamily="monospace"
              >
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
              left: Math.min(tooltip.x + 12, (containerRef.current?.clientWidth ?? 400) - 200),
              top: Math.min(tooltip.y + 12, (containerRef.current?.clientHeight ?? 300) - 180),
              zIndex: 20,
              backgroundColor: "rgba(15,15,20,0.95)",
              border: `1px solid ${tooltip.marker.player === "P1" ? "rgba(220,38,38,0.5)" : "rgba(37,99,235,0.5)"}`,
              borderRadius: 8,
              padding: "8px 10px",
              minWidth: 180,
              pointerEvents: "none",
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: tooltip.marker.player === "P1" ? "#f87171" : "#60a5fa",
                marginBottom: 4,
              }}
            >
              {tooltip.marker.unitName}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "2px 8px" }}>
              {[
                ["M", tooltip.marker.stats.movement],
                ["T", String(tooltip.marker.stats.toughness)],
                ["Sv", tooltip.marker.stats.save],
                ["W", `${tooltip.marker.currentWounds}/${tooltip.marker.maxWounds}`],
                ["Ld", tooltip.marker.stats.leadership],
                ["OC", String(tooltip.marker.stats.oc)],
              ].map(([label, val]) => (
                <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.45)", textTransform: "uppercase" }}>
                    {label}
                  </span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.9)", fontWeight: 600 }}>
                    {val}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
