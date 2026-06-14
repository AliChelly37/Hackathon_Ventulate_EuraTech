export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agents: {
        Row: {
          age: number | null
          alpha_score: number | null
          commitment_status: string | null
          consecutive_bad_turns: number | null
          contradiction: string | null
          conviction: number
          created_at: string
          critical_traits: Json | null
          dd_depth_level: number | null
          dd_questions_asked: string[] | null
          debrief_negative_remarks: string | null
          debrief_pitch_quality_score: number | null
          debrief_positive_remarks: string | null
          debrief_relevance_score: number | null
          debrief_verdict: string | null
          fund_name: string | null
          has_left: boolean | null
          hidden_agenda: string | null
          id: string
          initial_comment: string | null
          interest_signal: string | null
          investment_thesis: string | null
          investor_type: string | null
          is_lead_candidate: boolean | null
          main_objection: string | null
          name: string
          order_index: number
          pattern_match_internal: Json | null
          portfolio_pattern: Json | null
          positive_traits: Json | null
          positive_trigger: string | null
          priorities: string
          proposed_ticket: number | null
          proposed_valuation: number | null
          recent_wound: string | null
          red_flag: string | null
          role: string
          secret_dealbreaker: string | null
          session_id: string
          style_scores: Json | null
          thesis_fit_real: string | null
          ticket_max: number | null
          ticket_min: number | null
          verbal_tic: string | null
          weight: number
        }
        Insert: {
          age?: number | null
          alpha_score?: number | null
          commitment_status?: string | null
          consecutive_bad_turns?: number | null
          contradiction?: string | null
          conviction?: number
          created_at?: string
          critical_traits?: Json | null
          dd_depth_level?: number | null
          dd_questions_asked?: string[] | null
          debrief_negative_remarks?: string | null
          debrief_pitch_quality_score?: number | null
          debrief_positive_remarks?: string | null
          debrief_relevance_score?: number | null
          debrief_verdict?: string | null
          fund_name?: string | null
          has_left?: boolean | null
          hidden_agenda?: string | null
          id?: string
          initial_comment?: string | null
          interest_signal?: string | null
          investment_thesis?: string | null
          investor_type?: string | null
          is_lead_candidate?: boolean | null
          main_objection?: string | null
          name: string
          order_index?: number
          pattern_match_internal?: Json | null
          portfolio_pattern?: Json | null
          positive_traits?: Json | null
          positive_trigger?: string | null
          priorities: string
          proposed_ticket?: number | null
          proposed_valuation?: number | null
          recent_wound?: string | null
          red_flag?: string | null
          role: string
          secret_dealbreaker?: string | null
          session_id: string
          style_scores?: Json | null
          thesis_fit_real?: string | null
          ticket_max?: number | null
          ticket_min?: number | null
          verbal_tic?: string | null
          weight: number
        }
        Update: {
          age?: number | null
          alpha_score?: number | null
          commitment_status?: string | null
          consecutive_bad_turns?: number | null
          contradiction?: string | null
          conviction?: number
          created_at?: string
          critical_traits?: Json | null
          dd_depth_level?: number | null
          dd_questions_asked?: string[] | null
          debrief_negative_remarks?: string | null
          debrief_pitch_quality_score?: number | null
          debrief_positive_remarks?: string | null
          debrief_relevance_score?: number | null
          debrief_verdict?: string | null
          fund_name?: string | null
          has_left?: boolean | null
          hidden_agenda?: string | null
          id?: string
          initial_comment?: string | null
          interest_signal?: string | null
          investment_thesis?: string | null
          investor_type?: string | null
          is_lead_candidate?: boolean | null
          main_objection?: string | null
          name?: string
          order_index?: number
          pattern_match_internal?: Json | null
          portfolio_pattern?: Json | null
          positive_traits?: Json | null
          positive_trigger?: string | null
          priorities?: string
          proposed_ticket?: number | null
          proposed_valuation?: number | null
          recent_wound?: string | null
          red_flag?: string | null
          role?: string
          secret_dealbreaker?: string | null
          session_id?: string
          style_scores?: Json | null
          thesis_fit_real?: string | null
          ticket_max?: number | null
          ticket_min?: number | null
          verbal_tic?: string | null
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "agents_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          addressed_to: string | null
          agent_id: string | null
          content: string
          created_at: string
          dd_level_tag: number | null
          id: string
          pattern_match_cited: string | null
          proposed_ticket: number | null
          proposed_valuation: number | null
          sender: string
          sender_type: string | null
          session_id: string
          turn_index: number | null
        }
        Insert: {
          addressed_to?: string | null
          agent_id?: string | null
          content: string
          created_at?: string
          dd_level_tag?: number | null
          id?: string
          pattern_match_cited?: string | null
          proposed_ticket?: number | null
          proposed_valuation?: number | null
          sender: string
          sender_type?: string | null
          session_id: string
          turn_index?: number | null
        }
        Update: {
          addressed_to?: string | null
          agent_id?: string | null
          content?: string
          created_at?: string
          dd_level_tag?: number | null
          id?: string
          pattern_match_cited?: string | null
          proposed_ticket?: number | null
          proposed_valuation?: number | null
          sender?: string
          sender_type?: string | null
          session_id?: string
          turn_index?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          final_t: number
          id: string
          negatives: Json
          outcome: string
          positives: Json
          session_id: string
          timeline: Json
          tips: Json
        }
        Insert: {
          created_at?: string
          final_t: number
          id?: string
          negatives?: Json
          outcome: string
          positives?: Json
          session_id: string
          timeline?: Json
          tips?: Json
        }
        Update: {
          created_at?: string
          final_t?: number
          id?: string
          negatives?: Json
          outcome?: string
          positives?: Json
          session_id?: string
          timeline?: Json
          tips?: Json
        }
        Relationships: [
          {
            foreignKeyName: "reports_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          b2b_state: Json
          can_resume_discussion: boolean | null
          created_at: string
          current_turn: number
          debrief_started_at: string | null
          free_pitch_content: string | null
          free_pitch_duration_seconds: number | null
          free_pitch_topics_covered: Json | null
          game_mode: string
          id: string
          lead_emergence_turn: number | null
          lead_investor_id: string | null
          phase: string | null
          pis_history: Json | null
          pitch_stage: string | null
          product_context: Json
          profile_type: string
          resume_cycles_count: number | null
          skill: string
          status: string
          target_amount: number | null
          target_hard_yes: number | null
          target_valuation: number | null
          turn_limit: number
          user_id: string
          win_condition: string | null
        }
        Insert: {
          b2b_state?: Json
          can_resume_discussion?: boolean | null
          created_at?: string
          current_turn?: number
          debrief_started_at?: string | null
          free_pitch_content?: string | null
          free_pitch_duration_seconds?: number | null
          free_pitch_topics_covered?: Json | null
          game_mode: string
          id?: string
          lead_emergence_turn?: number | null
          lead_investor_id?: string | null
          phase?: string | null
          pis_history?: Json | null
          pitch_stage?: string | null
          product_context?: Json
          profile_type?: string
          resume_cycles_count?: number | null
          skill?: string
          status?: string
          target_amount?: number | null
          target_hard_yes?: number | null
          target_valuation?: number | null
          turn_limit?: number
          user_id: string
          win_condition?: string | null
        }
        Update: {
          b2b_state?: Json
          can_resume_discussion?: boolean | null
          created_at?: string
          current_turn?: number
          debrief_started_at?: string | null
          free_pitch_content?: string | null
          free_pitch_duration_seconds?: number | null
          free_pitch_topics_covered?: Json | null
          game_mode?: string
          id?: string
          lead_emergence_turn?: number | null
          lead_investor_id?: string | null
          phase?: string | null
          pis_history?: Json | null
          pitch_stage?: string | null
          product_context?: Json
          profile_type?: string
          resume_cycles_count?: number | null
          skill?: string
          status?: string
          target_amount?: number | null
          target_hard_yes?: number | null
          target_valuation?: number | null
          turn_limit?: number
          user_id?: string
          win_condition?: string | null
        }
        Relationships: []
      }
      turns: {
        Row: {
          created_at: string
          id: string
          overall_t: number
          session_id: string
          snapshot: Json
          turn_index: number
        }
        Insert: {
          created_at?: string
          id?: string
          overall_t: number
          session_id: string
          snapshot: Json
          turn_index: number
        }
        Update: {
          created_at?: string
          id?: string
          overall_t?: number
          session_id?: string
          snapshot?: Json
          turn_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "turns_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
