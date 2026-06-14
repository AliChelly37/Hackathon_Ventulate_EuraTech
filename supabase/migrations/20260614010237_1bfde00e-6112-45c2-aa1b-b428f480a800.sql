
-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_self_select" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_self_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_type TEXT NOT NULL DEFAULT 'entrepreneur',
  skill TEXT NOT NULL DEFAULT 'negotiation',
  game_mode TEXT NOT NULL CHECK (game_mode IN ('chrono','libre')),
  turn_limit INT NOT NULL DEFAULT 12,
  current_turn INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'intake' CHECK (status IN ('intake','playing','won','lost')),
  product_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions TO authenticated;
GRANT ALL ON public.sessions TO service_role;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions_owner_all" ON public.sessions FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  priorities TEXT NOT NULL,
  weight NUMERIC NOT NULL,
  conviction NUMERIC NOT NULL DEFAULT 0.25,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_agents_session ON public.agents(session_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agents TO authenticated;
GRANT ALL ON public.agents TO service_role;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agents_owner_all" ON public.agents FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND s.user_id = auth.uid()));

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  sender TEXT NOT NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  addressed_to TEXT,
  content TEXT NOT NULL,
  turn_index INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_session_created ON public.messages(session_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_owner_all" ON public.messages FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND s.user_id = auth.uid()));

CREATE TABLE public.turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  turn_index INT NOT NULL,
  overall_t NUMERIC NOT NULL,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_turns_session ON public.turns(session_id, turn_index);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.turns TO authenticated;
GRANT ALL ON public.turns TO service_role;
ALTER TABLE public.turns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "turns_owner_all" ON public.turns FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND s.user_id = auth.uid()));

CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL UNIQUE REFERENCES public.sessions(id) ON DELETE CASCADE,
  outcome TEXT NOT NULL,
  final_t NUMERIC NOT NULL,
  positives JSONB NOT NULL DEFAULT '[]'::jsonb,
  negatives JSONB NOT NULL DEFAULT '[]'::jsonb,
  tips JSONB NOT NULL DEFAULT '[]'::jsonb,
  timeline JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports_owner_all" ON public.reports FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND s.user_id = auth.uid()));

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS pitch_stage text,
  ADD COLUMN IF NOT EXISTS win_condition text,
  ADD COLUMN IF NOT EXISTS target_valuation numeric,
  ADD COLUMN IF NOT EXISTS target_amount numeric,
  ADD COLUMN IF NOT EXISTS target_hard_yes int,
  ADD COLUMN IF NOT EXISTS lead_investor_id uuid,
  ADD COLUMN IF NOT EXISTS lead_emergence_turn int,
  ADD COLUMN IF NOT EXISTS phase text DEFAULT 'free_pitch',
  ADD COLUMN IF NOT EXISTS free_pitch_content text,
  ADD COLUMN IF NOT EXISTS free_pitch_topics_covered jsonb DEFAULT '{"problem":false,"solution":false,"market":false,"business_model":false,"team":false,"traction":false,"competition":false,"ask":false}'::jsonb,
  ADD COLUMN IF NOT EXISTS free_pitch_duration_seconds int,
  ADD COLUMN IF NOT EXISTS debrief_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS can_resume_discussion boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS resume_cycles_count int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pis_history jsonb DEFAULT '[]'::jsonb;

ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS age int,
  ADD COLUMN IF NOT EXISTS investor_type text,
  ADD COLUMN IF NOT EXISTS fund_name text,
  ADD COLUMN IF NOT EXISTS ticket_min numeric,
  ADD COLUMN IF NOT EXISTS ticket_max numeric,
  ADD COLUMN IF NOT EXISTS investment_thesis text,
  ADD COLUMN IF NOT EXISTS portfolio_pattern jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS positive_traits jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS critical_traits jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS initial_comment text,
  ADD COLUMN IF NOT EXISTS verbal_tic text,
  ADD COLUMN IF NOT EXISTS main_objection text,
  ADD COLUMN IF NOT EXISTS positive_trigger text,
  ADD COLUMN IF NOT EXISTS red_flag text,
  ADD COLUMN IF NOT EXISTS recent_wound text,
  ADD COLUMN IF NOT EXISTS contradiction text,
  ADD COLUMN IF NOT EXISTS dd_depth_level int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dd_questions_asked text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS interest_signal text DEFAULT 'cold',
  ADD COLUMN IF NOT EXISTS commitment_status text DEFAULT 'undecided',
  ADD COLUMN IF NOT EXISTS proposed_valuation numeric,
  ADD COLUMN IF NOT EXISTS proposed_ticket numeric,
  ADD COLUMN IF NOT EXISTS is_lead_candidate boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_left boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS consecutive_bad_turns int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS style_scores jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS hidden_agenda text,
  ADD COLUMN IF NOT EXISTS thesis_fit_real text,
  ADD COLUMN IF NOT EXISTS secret_dealbreaker text,
  ADD COLUMN IF NOT EXISTS pattern_match_internal jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS alpha_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS debrief_verdict text,
  ADD COLUMN IF NOT EXISTS debrief_positive_remarks text,
  ADD COLUMN IF NOT EXISTS debrief_negative_remarks text,
  ADD COLUMN IF NOT EXISTS debrief_pitch_quality_score int,
  ADD COLUMN IF NOT EXISTS debrief_relevance_score int;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS sender_type text,
  ADD COLUMN IF NOT EXISTS dd_level_tag int,
  ADD COLUMN IF NOT EXISTS pattern_match_cited text,
  ADD COLUMN IF NOT EXISTS proposed_valuation numeric,
  ADD COLUMN IF NOT EXISTS proposed_ticket numeric;

ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS b2b_state jsonb NOT NULL DEFAULT '{}'::jsonb;
