# Applying the Initial Database Migration

Run the SQL in `migrations/001_initial_schema.sql` using the Supabase dashboard SQL editor.

## Steps

1. Open [https://supabase.com/dashboard](https://supabase.com/dashboard) and select the **tabletop-hub** project.
2. In the left sidebar, click **SQL Editor**.
3. Click **New query**.
4. Open `supabase/migrations/001_initial_schema.sql` and copy the entire contents.
5. Paste it into the SQL editor.
6. Click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`).

You should see a success message with no errors. The migration creates:

- `profiles` — extends `auth.users` with username and avatar
- `dnd_characters` — full D&D 5e character sheet data
- `dnd_games` — game sessions with board state
- `dnd_game_players` — game membership (DM + players)
- `dnd_monsters` — DM monster library (custom + SRD)
- `warhammer_armies` — army lists (40K / Age of Sigmar)
- `warhammer_games` — Warhammer game sessions
- `warhammer_game_players` — Warhammer game membership

Row Level Security is enabled on all tables. A trigger automatically creates a `profiles` row whenever a new user signs up via Supabase Auth.

## Verifying the migration

After running, go to **Table Editor** in the dashboard. You should see all 8 tables listed under the `public` schema.

## Re-running

If you need to re-run the migration (e.g. after resetting the database), drop the tables first or use the Supabase dashboard **Reset database** option, then re-apply the SQL.
