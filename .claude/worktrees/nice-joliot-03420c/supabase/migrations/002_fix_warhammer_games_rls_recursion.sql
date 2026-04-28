-- Fix infinite recursion in warhammer_games RLS policies.
--
-- Root cause: warhammer_games SELECT policy subqueries warhammer_game_players,
-- and warhammer_game_players SELECT policy subqueries warhammer_games — a cycle
-- that Postgres detects as infinite recursion.
--
-- Fix: replace the direct warhammer_games subquery in warhammer_game_players
-- with a SECURITY DEFINER function that bypasses RLS on warhammer_games.

CREATE OR REPLACE FUNCTION public.is_warhammer_game_host(p_game_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM warhammer_games
    WHERE id = p_game_id AND host_id = auth.uid()
  );
$$;

DROP POLICY IF EXISTS "Users can view warhammer game players" ON warhammer_game_players;

CREATE POLICY "Users can view warhammer game players" ON warhammer_game_players
FOR SELECT USING (
  auth.uid() = player_id
  OR is_warhammer_game_host(game_id)
);
