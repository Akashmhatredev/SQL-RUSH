/**
 * Supabase database types for supabase/migrations, in the format produced by
 * `supabase gen types typescript`. After changing the schema, regenerate with:
 *
 *   npx supabase gen types typescript --project-id <ref> --schema public > types/database.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Difficulty = "easy" | "medium" | "hard" | "expert";
type QuestionType = "write-sql" | "multiple-choice" | "fix-query" | "predict-output" | "drag-drop";
type GameMode = "classic" | "endless" | "practice" | "daily";
type UserRole = "player" | "admin";
type GameStatus = "active" | "finished" | "abandoned";
type EndReason = "lives" | "complete" | "quit";
type Metric =
  | "questions_correct"
  | "games_played"
  | "best_streak"
  | "expert_correct"
  | "perfect_runs"
  | "best_fast_run"
  | "daily_completed"
  | "best_day_streak"
  | "high_score"
  | "total_score"
  | "xp";

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "12";
  };
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          role: UserRole;
          xp: number;
          level: number;
          games_played: number;
          total_score: number;
          high_score: number;
          questions_answered: number;
          questions_correct: number;
          expert_correct: number;
          best_streak: number;
          perfect_runs: number;
          best_fast_run: number;
          fastest_answer_ms: number | null;
          daily_completed: number;
          day_streak: number;
          best_day_streak: number;
          last_played_on: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: {
          username?: string;
          display_name?: string | null;
          avatar_url?: string | null;
        };
        Relationships: [];
      };
      questions: {
        Row: {
          id: number;
          difficulty: Difficulty;
          type: QuestionType;
          topic: string;
          question: string;
          answer: string;
          alternatives: string[];
          options: string[] | null;
          query: string | null;
          sample_tables: Json | null;
          tokens: string[] | null;
          distractors: string[];
          hint: string | null;
          explanation: string;
          schema_tables: string[];
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          difficulty: Difficulty;
          type: QuestionType;
          topic: string;
          question: string;
          answer: string;
          alternatives?: string[];
          options?: string[] | null;
          query?: string | null;
          sample_tables?: Json | null;
          tokens?: string[] | null;
          distractors?: string[];
          hint?: string | null;
          explanation: string;
          schema_tables?: string[];
          is_active?: boolean;
          created_by?: string | null;
        };
        Update: {
          difficulty?: Difficulty;
          type?: QuestionType;
          topic?: string;
          question?: string;
          answer?: string;
          alternatives?: string[];
          options?: string[] | null;
          query?: string | null;
          sample_tables?: Json | null;
          tokens?: string[] | null;
          distractors?: string[];
          hint?: string | null;
          explanation?: string;
          schema_tables?: string[];
          is_active?: boolean;
        };
        Relationships: [];
      };
      achievements: {
        Row: {
          id: string;
          title: string;
          description: string;
          icon: string;
          metric: Metric;
          threshold: number;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          title: string;
          description: string;
          icon?: string;
          metric: Metric;
          threshold: number;
          sort_order?: number;
          is_active?: boolean;
        };
        Update: {
          title?: string;
          description?: string;
          icon?: string;
          metric?: Metric;
          threshold?: number;
          sort_order?: number;
          is_active?: boolean;
        };
        Relationships: [];
      };
      user_achievements: {
        Row: {
          user_id: string;
          achievement_id: string;
          unlocked_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "user_achievements_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_achievements_achievement_id_fkey";
            columns: ["achievement_id"];
            isOneToOne: false;
            referencedRelation: "achievements";
            referencedColumns: ["id"];
          },
        ];
      };
      scores: {
        Row: {
          id: string;
          user_id: string;
          session_id: string;
          mode: GameMode;
          difficulty: Difficulty | null;
          ranked: boolean;
          score: number;
          xp_earned: number;
          answered: number;
          correct: number;
          wrong: number;
          best_streak: number;
          accuracy: number;
          end_reason: EndReason;
          duration_seconds: number;
          challenge_date: string | null;
          pattern: string | null;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "scores_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      game_sessions: {
        Row: {
          id: string;
          user_id: string;
          mode: GameMode;
          difficulty: Difficulty;
          types: QuestionType[];
          status: GameStatus;
          challenge_date: string | null;
          planned_ids: number[] | null;
          served_ids: number[];
          current_question_id: number | null;
          current_served_at: string | null;
          tier: number;
          lives: number;
          score: number;
          xp: number;
          streak: number;
          best_streak: number;
          answered: number;
          correct: number;
          wrong: number;
          revealed: number;
          fast_correct: number;
          pause_budget_ms: number;
          end_reason: EndReason | null;
          started_at: string;
          finished_at: string | null;
          last_activity_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      game_answers: {
        Row: {
          id: number;
          session_id: string;
          user_id: string;
          question_id: number | null;
          difficulty: Difficulty;
          type: QuestionType;
          answer: Json;
          is_correct: boolean;
          timed_out: boolean;
          revealed: boolean;
          seconds_taken: number;
          points: number;
          xp: number;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      start_game: {
        Args: { p_mode: GameMode; p_difficulty?: Difficulty; p_types?: QuestionType[] | null };
        Returns: Json;
      };
      next_question: { Args: { p_session_id: string }; Returns: Json };
      submit_answer: {
        Args: {
          p_session_id: string;
          p_answer: Json;
          p_paused_ms?: number;
          p_reveal?: boolean;
          p_timed_out?: boolean;
        };
        Returns: Json;
      };
      end_game: { Args: { p_session_id: string }; Returns: Json };
      get_leaderboard: {
        Args: { p_board: string; p_limit?: number; p_user?: string | null };
        Returns: {
          rank: number;
          user_id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          level: number;
          value: number;
          games: number;
        }[];
      };
      get_my_stats: { Args: Record<PropertyKey, never>; Returns: Json };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      admin_list_users: {
        Args: { p_search?: string | null; p_limit?: number; p_offset?: number };
        Returns: {
          id: string;
          email: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          role: UserRole;
          xp: number;
          level: number;
          games_played: number;
          total_score: number;
          high_score: number;
          questions_answered: number;
          questions_correct: number;
          provider: string;
          created_at: string;
          last_sign_in_at: string | null;
          total_count: number;
        }[];
      };
      admin_set_role: { Args: { p_user: string; p_role: UserRole }; Returns: undefined };
      admin_overview: { Args: Record<PropertyKey, never>; Returns: Json };
      normalize_sql: { Args: { p_sql: string }; Returns: string };
      normalize_text: { Args: { p_text: string }; Returns: string };
      level_for_xp: { Args: { p_xp: number }; Returns: number };
    };
    Enums: {
      difficulty: Difficulty;
      question_type: QuestionType;
      game_mode: GameMode;
      user_role: UserRole;
      game_status: GameStatus;
      end_reason: EndReason;
      achievement_metric: Metric;
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database["public"];
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];

export type Profile = Tables<"profiles">;
export type QuestionRow = Tables<"questions">;
export type AchievementRow = Tables<"achievements">;
export type ScoreRow = Tables<"scores">;
export type AchievementMetric = Enums<"achievement_metric">;
export type UserRoleEnum = Enums<"user_role">;
