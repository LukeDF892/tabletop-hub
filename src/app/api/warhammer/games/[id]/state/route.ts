import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// PATCH /api/warhammer/games/[id]/state
// Body: { invite_code, game_state, current_phase, p2_user_id? }
// The invite_code acts as a shared secret — only players who know the code can update.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json() as {
    invite_code: string;
    game_state?: Record<string, unknown>;
    current_phase?: string;
    p2_user_id?: string;
  };

  if (!body.invite_code) {
    return NextResponse.json({ error: "invite_code required" }, { status: 400 });
  }

  // Verify invite_code matches this game (auth via shared secret)
  const { data: game, error: fetchErr } = await supabaseAdmin
    .from("warhammer_games")
    .select("id, invite_code")
    .eq("id", id)
    .single();

  if (fetchErr || !game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  if (game.invite_code !== body.invite_code) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 403 });
  }

  const updates: Record<string, unknown> = {};
  if (body.game_state !== undefined) updates.game_state = body.game_state;
  if (body.current_phase !== undefined) updates.current_phase = body.current_phase;
  if (body.p2_user_id !== undefined) updates.p2_user_id = body.p2_user_id;

  const { error: updateErr } = await supabaseAdmin
    .from("warhammer_games")
    .update(updates)
    .eq("id", id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
