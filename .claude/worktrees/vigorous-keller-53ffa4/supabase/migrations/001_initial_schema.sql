-- Users profile (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- D&D Characters
CREATE TABLE public.dnd_characters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  race TEXT,
  class TEXT,
  subclass TEXT,
  level INTEGER DEFAULT 1,
  background TEXT,
  alignment TEXT,
  -- Ability scores
  strength INTEGER DEFAULT 10,
  dexterity INTEGER DEFAULT 10,
  constitution INTEGER DEFAULT 10,
  intelligence INTEGER DEFAULT 10,
  wisdom INTEGER DEFAULT 10,
  charisma INTEGER DEFAULT 10,
  -- Combat stats
  max_hp INTEGER DEFAULT 8,
  current_hp INTEGER DEFAULT 8,
  temp_hp INTEGER DEFAULT 0,
  armor_class INTEGER DEFAULT 10,
  speed INTEGER DEFAULT 30,
  initiative INTEGER DEFAULT 0,
  -- Resources
  hit_dice TEXT DEFAULT '1d8',
  hit_dice_remaining INTEGER DEFAULT 1,
  death_saves_successes INTEGER DEFAULT 0,
  death_saves_failures INTEGER DEFAULT 0,
  -- Meta
  experience_points INTEGER DEFAULT 0,
  inspiration BOOLEAN DEFAULT FALSE,
  proficiency_bonus INTEGER DEFAULT 2,
  -- JSON fields for complex data
  skills JSONB DEFAULT '{}',
  saving_throws JSONB DEFAULT '{}',
  equipment JSONB DEFAULT '[]',
  spells JSONB DEFAULT '{}',
  features JSONB DEFAULT '[]',
  notes TEXT,
  portrait_url TEXT,
  dnd_beyond_url TEXT,
  -- Import tracking
  imported_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- D&D Games
CREATE TABLE public.dnd_games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dm_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  invite_code TEXT UNIQUE DEFAULT substring(md5(random()::text), 1, 8),
  is_active BOOLEAN DEFAULT TRUE,
  -- Board state
  board_config JSONB DEFAULT '{}',
  map_image_url TEXT,
  -- Game state
  current_scene TEXT,
  game_state JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Game participants
CREATE TABLE public.dnd_game_players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID REFERENCES public.dnd_games(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  character_id UUID REFERENCES public.dnd_characters(id),
  role TEXT DEFAULT 'player', -- 'dm' or 'player'
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(game_id, player_id)
);

-- D&D Monsters (DM library)
CREATE TABLE public.dnd_monsters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  size TEXT,
  type TEXT,
  alignment TEXT,
  armor_class INTEGER,
  hit_points INTEGER,
  hit_dice TEXT,
  speed JSONB DEFAULT '{}',
  -- Ability scores
  strength INTEGER DEFAULT 10,
  dexterity INTEGER DEFAULT 10,
  constitution INTEGER DEFAULT 10,
  intelligence INTEGER DEFAULT 10,
  wisdom INTEGER DEFAULT 10,
  charisma INTEGER DEFAULT 10,
  -- Combat
  challenge_rating TEXT,
  xp INTEGER,
  -- Complex data
  saving_throws JSONB DEFAULT '{}',
  skills JSONB DEFAULT '{}',
  damage_resistances TEXT[],
  damage_immunities TEXT[],
  condition_immunities TEXT[],
  senses JSONB DEFAULT '{}',
  languages TEXT,
  special_abilities JSONB DEFAULT '[]',
  actions JSONB DEFAULT '[]',
  legendary_actions JSONB DEFAULT '[]',
  reactions JSONB DEFAULT '[]',
  source TEXT DEFAULT 'custom',
  is_system BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Warhammer Armies
CREATE TABLE public.warhammer_armies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  game_system TEXT NOT NULL, -- 'wh40k' or 'age_of_sigmar'
  faction TEXT NOT NULL,
  subfaction TEXT,
  points_limit INTEGER DEFAULT 2000,
  -- Army list stored as JSON
  units JSONB DEFAULT '[]',
  total_points INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Warhammer Games
CREATE TABLE public.warhammer_games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  host_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  game_system TEXT NOT NULL,
  invite_code TEXT UNIQUE DEFAULT substring(md5(random()::text), 1, 8),
  is_active BOOLEAN DEFAULT TRUE,
  -- Game state
  current_turn INTEGER DEFAULT 1,
  current_phase TEXT DEFAULT 'command',
  game_state JSONB DEFAULT '{}',
  board_config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Warhammer Game Players
CREATE TABLE public.warhammer_game_players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID REFERENCES public.warhammer_games(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  army_id UUID REFERENCES public.warhammer_armies(id),
  player_order INTEGER DEFAULT 1,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(game_id, player_id)
);

-- Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dnd_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dnd_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dnd_game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dnd_monsters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warhammer_armies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warhammer_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warhammer_game_players ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (TRUE);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own characters" ON public.dnd_characters FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own characters" ON public.dnd_characters FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own characters" ON public.dnd_characters FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own characters" ON public.dnd_characters FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Game players can view game characters" ON public.dnd_characters FOR SELECT USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM public.dnd_game_players WHERE game_id IN (
    SELECT game_id FROM public.dnd_game_players WHERE character_id = dnd_characters.id
  ) AND player_id = auth.uid())
);

CREATE POLICY "Anyone can view system monsters" ON public.dnd_monsters FOR SELECT USING (is_system = TRUE OR auth.uid() = created_by);
CREATE POLICY "Users can create monsters" ON public.dnd_monsters FOR INSERT WITH CHECK (auth.uid() = created_by OR is_system = FALSE);

CREATE POLICY "Users can view own armies" ON public.warhammer_armies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own armies" ON public.warhammer_armies FOR ALL USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_dnd_characters_updated_at BEFORE UPDATE ON public.dnd_characters FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_dnd_games_updated_at BEFORE UPDATE ON public.dnd_games FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_warhammer_armies_updated_at BEFORE UPDATE ON public.warhammer_armies FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_warhammer_games_updated_at BEFORE UPDATE ON public.warhammer_games FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();
