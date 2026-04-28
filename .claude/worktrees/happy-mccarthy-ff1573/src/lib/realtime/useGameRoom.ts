"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type GameEvent =
  | "player_joined"
  | "player_left"
  | "dice_roll"
  | "hp_change"
  | "turn_change"
  | "chat_message"
  | "state_update";

export interface PlayerPresenceState {
  userId: string;
  username: string;
  characterName?: string;
  online: boolean;
  lastSeen: number;
}

export interface GameMessage {
  id: string;
  event: GameEvent;
  payload: Record<string, unknown>;
  senderId: string;
  senderName: string;
  timestamp: number;
}

interface UseGameRoomOptions {
  gameId: string;
  userId: string;
  username: string;
  characterName?: string;
}

export function useGameRoom({
  gameId,
  userId,
  username,
  characterName,
}: UseGameRoomOptions) {
  const [players, setPlayers] = useState<PlayerPresenceState[]>([]);
  const [messages, setMessages] = useState<GameMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabase = createClient();

  const addMessage = useCallback((msg: GameMessage) => {
    setMessages((prev) => {
      const next = [msg, ...prev];
      return next.slice(0, 50);
    });
  }, []);

  const broadcast = useCallback(
    (event: GameEvent, payload: Record<string, unknown>) => {
      if (!channelRef.current) return;
      const msg: GameMessage = {
        id: crypto.randomUUID(),
        event,
        payload,
        senderId: userId,
        senderName: username,
        timestamp: Date.now(),
      };
      channelRef.current.send({
        type: "broadcast",
        event,
        payload: msg,
      });
      addMessage(msg);
    },
    [userId, username, addMessage]
  );

  useEffect(() => {
    if (!gameId || !userId) return;

    const channel = supabase.channel(`game:${gameId}`, {
      config: { presence: { key: userId } },
    });

    channelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{
          username: string;
          characterName?: string;
        }>();
        const presencePlayers: PlayerPresenceState[] = Object.entries(
          state
        ).map(([uid, presences]) => {
          const p = presences[0];
          return {
            userId: uid,
            username: p.username,
            characterName: p.characterName,
            online: true,
            lastSeen: Date.now(),
          };
        });
        setPlayers(presencePlayers);
      })
      .on("presence", { event: "join" }, ({ newPresences }) => {
        newPresences.forEach((p) => {
          const joined = p as unknown as {
            key: string;
            username: string;
            characterName?: string;
          };
          broadcast("player_joined", {
            userId: joined.key,
            username: joined.username,
          });
        });
      })
      .on("presence", { event: "leave" }, ({ leftPresences }) => {
        leftPresences.forEach((p) => {
          const left = p as unknown as { key: string; username: string };
          broadcast("player_left", {
            userId: left.key,
            username: left.username,
          });
          setPlayers((prev) =>
            prev.map((player) =>
              player.userId === left.key
                ? { ...player, online: false }
                : player
            )
          );
        });
      })
      .on(
        "broadcast",
        { event: "*" },
        ({ event, payload }: { event: string; payload: GameMessage }) => {
          if (payload.senderId !== userId) {
            addMessage({ ...payload, event: event as GameEvent });
          }
        }
      )
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          setIsConnected(true);
          await channel.track({
            userId,
            username,
            characterName,
            online: true,
          });
        } else if (status === "CLOSED") {
          setIsConnected(false);
        }
      });

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
      channelRef.current = null;
      setIsConnected(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, userId]);

  return { players, broadcast, messages, isConnected };
}
