"use client";

import type { PlayerPresenceState } from "@/lib/realtime/useGameRoom";

interface PlayerPresenceProps {
  players: PlayerPresenceState[];
  currentUserId?: string;
}

export default function PlayerPresence({
  players,
  currentUserId,
}: PlayerPresenceProps) {
  const online = players.filter((p) => p.online).length;

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3"
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
          Party
        </h3>
        <span
          className="text-xs px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: online > 0 ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.06)",
            border: `1px solid ${online > 0 ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.1)"}`,
            color: online > 0 ? "#10b981" : "var(--text-muted)",
          }}
        >
          {online} online
        </span>
      </div>

      {players.length === 0 ? (
        <p className="text-xs italic" style={{ color: "var(--text-muted)" }}>
          No players yet...
        </p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {players.map((player) => (
            <div
              key={player.userId}
              className="group relative flex flex-col items-center gap-1.5"
              title={`${player.username}${player.characterName ? ` · ${player.characterName}` : ""}`}
            >
              <div className="relative">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                  style={{
                    backgroundColor:
                      player.userId === currentUserId
                        ? "rgba(124,58,237,0.3)"
                        : "rgba(255,255,255,0.08)",
                    border: `2px solid ${
                      player.online
                        ? player.userId === currentUserId
                          ? "rgba(124,58,237,0.7)"
                          : "rgba(16,185,129,0.5)"
                        : "rgba(255,255,255,0.1)"
                    }`,
                    color:
                      player.userId === currentUserId
                        ? "var(--purple-light)"
                        : "var(--text-muted)",
                    opacity: player.online ? 1 : 0.45,
                  }}
                >
                  {player.username[0].toUpperCase()}
                </div>
                {/* Status dot */}
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                  style={{
                    backgroundColor: player.online ? "#10b981" : "#6b7280",
                    borderColor: "var(--bg-card)",
                  }}
                />
              </div>
              <span
                className="text-xs max-w-[56px] truncate text-center"
                style={{ color: "var(--text-muted)" }}
              >
                {player.username}
              </span>
              {/* Tooltip on hover */}
              <div
                className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs shadow-lg"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  border: "1px solid var(--border-card)",
                  color: "var(--text-primary)",
                }}
              >
                <p className="font-medium">{player.username}</p>
                {player.characterName && (
                  <p style={{ color: "var(--text-muted)" }}>
                    {player.characterName}
                  </p>
                )}
                <p
                  style={{
                    color: player.online ? "#10b981" : "#6b7280",
                    fontSize: "10px",
                  }}
                >
                  {player.online ? "Online" : "Offline"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
