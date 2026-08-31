/** @format */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17";
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      _applied_migrations: {
        Row: {
          applied_at: string;
          filename: string;
        };
        Insert: {
          applied_at?: string;
          filename: string;
        };
        Update: {
          applied_at?: string;
          filename?: string;
        };
        Relationships: [];
      };
      academic_periods: {
        Row: {
          code: string;
          created_at: string;
          end_date: string;
          id: string;
          is_active: boolean;
          name: string;
          organization_id: string;
          start_date: string;
          updated_at: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          end_date: string;
          id?: string;
          is_active?: boolean;
          name: string;
          organization_id: string;
          start_date: string;
          updated_at?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          end_date?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          organization_id?: string;
          start_date?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "academic_periods_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      activities: {
        Row: {
          activity_type: string;
          allowed_ai_functions: Database["public"]["Enums"]["ai_function"][];
          allows_ai: boolean;
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          due_at: string | null;
          id: string;
          learning_stage_id: string;
          mastery_threshold: number | null;
          prompt: string;
          requires_attempt_before_ai: boolean;
          response_schema: string;
          rubric_id: string | null;
          sequence: number;
          status: Database["public"]["Enums"]["publication_status"];
          title: string;
          updated_at: string;
        };
        Insert: {
          activity_type: string;
          allowed_ai_functions?: Database["public"]["Enums"]["ai_function"][];
          allows_ai?: boolean;
          created_at?: string;
          created_by: string;
          deleted_at?: string | null;
          due_at?: string | null;
          id?: string;
          learning_stage_id: string;
          mastery_threshold?: number | null;
          prompt: string;
          requires_attempt_before_ai?: boolean;
          response_schema?: string;
          rubric_id?: string | null;
          sequence: number;
          status?: Database["public"]["Enums"]["publication_status"];
          title: string;
          updated_at?: string;
        };
        Update: {
          activity_type?: string;
          allowed_ai_functions?: Database["public"]["Enums"]["ai_function"][];
          allows_ai?: boolean;
          created_at?: string;
          created_by?: string;
          deleted_at?: string | null;
          due_at?: string | null;
          id?: string;
          learning_stage_id?: string;
          mastery_threshold?: number | null;
          prompt?: string;
          requires_attempt_before_ai?: boolean;
          response_schema?: string;
          rubric_id?: string | null;
          sequence?: number;
          status?: Database["public"]["Enums"]["publication_status"];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activities_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activities_learning_stage_id_fkey";
            columns: ["learning_stage_id"];
            isOneToOne: false;
            referencedRelation: "learning_stages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activities_rubric_id_fkey";
            columns: ["rubric_id"];
            isOneToOne: false;
            referencedRelation: "rubrics";
            referencedColumns: ["id"];
          },
        ];
      };
      activity_instructions: {
        Row: {
          activity_id: string;
          audience: string;
          content: string;
          created_at: string;
          id: string;
          sequence: number;
          updated_at: string;
        };
        Insert: {
          activity_id: string;
          audience: string;
          content: string;
          created_at?: string;
          id?: string;
          sequence: number;
          updated_at?: string;
        };
        Update: {
          activity_id?: string;
          audience?: string;
          content?: string;
          created_at?: string;
          id?: string;
          sequence?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activity_instructions_activity_id_fkey";
            columns: ["activity_id"];
            isOneToOne: false;
            referencedRelation: "activities";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_citations: {
        Row: {
          ai_feedback_id: string;
          created_at: string;
          id: string;
          is_traceable: boolean;
          quoted_text: string;
          source_chunk_id: string | null;
          source_id: string | null;
          source_version_id: string | null;
          verified_by_student: boolean;
        };
        Insert: {
          ai_feedback_id: string;
          created_at?: string;
          id?: string;
          is_traceable: boolean;
          quoted_text: string;
          source_chunk_id?: string | null;
          source_id?: string | null;
          source_version_id?: string | null;
          verified_by_student?: boolean;
        };
        Update: {
          ai_feedback_id?: string;
          created_at?: string;
          id?: string;
          is_traceable?: boolean;
          quoted_text?: string;
          source_chunk_id?: string | null;
          source_id?: string | null;
          source_version_id?: string | null;
          verified_by_student?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "ai_citations_ai_feedback_id_fkey";
            columns: ["ai_feedback_id"];
            isOneToOne: false;
            referencedRelation: "ai_feedback";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_citations_source_chunk_id_fkey";
            columns: ["source_chunk_id"];
            isOneToOne: false;
            referencedRelation: "source_chunks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_citations_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "sources";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_citations_source_version_id_fkey";
            columns: ["source_version_id"];
            isOneToOne: false;
            referencedRelation: "source_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_disclosures: {
        Row: {
          activity_id: string;
          attempt_id: string | null;
          created_at: string;
          functions_used: Database["public"]["Enums"]["ai_function"][];
          id: string;
          revision_id: string | null;
          statement: string;
          student_id: string;
        };
        Insert: {
          activity_id: string;
          attempt_id?: string | null;
          created_at?: string;
          functions_used?: Database["public"]["Enums"]["ai_function"][];
          id?: string;
          revision_id?: string | null;
          statement: string;
          student_id: string;
        };
        Update: {
          activity_id?: string;
          attempt_id?: string | null;
          created_at?: string;
          functions_used?: Database["public"]["Enums"]["ai_function"][];
          id?: string;
          revision_id?: string | null;
          statement?: string;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_disclosures_activity_id_fkey";
            columns: ["activity_id"];
            isOneToOne: false;
            referencedRelation: "activities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_disclosures_attempt_id_fkey";
            columns: ["attempt_id"];
            isOneToOne: false;
            referencedRelation: "attempts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_disclosures_revision_id_fkey";
            columns: ["revision_id"];
            isOneToOne: false;
            referencedRelation: "revisions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_disclosures_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_feedback: {
        Row: {
          acted_at: string | null;
          ai_interaction_id: string;
          body: string;
          created_at: string;
          dimension: Database["public"]["Enums"]["ct_dimension"] | null;
          id: string;
          kind: string;
          student_action: Database["public"]["Enums"]["ai_student_action"];
          title: string;
        };
        Insert: {
          acted_at?: string | null;
          ai_interaction_id: string;
          body: string;
          created_at?: string;
          dimension?: Database["public"]["Enums"]["ct_dimension"] | null;
          id?: string;
          kind: string;
          student_action?: Database["public"]["Enums"]["ai_student_action"];
          title: string;
        };
        Update: {
          acted_at?: string | null;
          ai_interaction_id?: string;
          body?: string;
          created_at?: string;
          dimension?: Database["public"]["Enums"]["ct_dimension"] | null;
          id?: string;
          kind?: string;
          student_action?: Database["public"]["Enums"]["ai_student_action"];
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_feedback_ai_interaction_id_fkey";
            columns: ["ai_interaction_id"];
            isOneToOne: false;
            referencedRelation: "ai_interactions";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_incidents: {
        Row: {
          ai_feedback_id: string;
          class_id: string;
          created_at: string;
          handled_at: string | null;
          handled_by: string | null;
          id: string;
          reason: string;
          reporter_id: string;
          resolution_note: string | null;
          status: Database["public"]["Enums"]["incident_status"];
          updated_at: string;
        };
        Insert: {
          ai_feedback_id: string;
          class_id: string;
          created_at?: string;
          handled_at?: string | null;
          handled_by?: string | null;
          id?: string;
          reason: string;
          reporter_id: string;
          resolution_note?: string | null;
          status?: Database["public"]["Enums"]["incident_status"];
          updated_at?: string;
        };
        Update: {
          ai_feedback_id?: string;
          class_id?: string;
          created_at?: string;
          handled_at?: string | null;
          handled_by?: string | null;
          id?: string;
          reason?: string;
          reporter_id?: string;
          resolution_note?: string | null;
          status?: Database["public"]["Enums"]["incident_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_incidents_ai_feedback_id_fkey";
            columns: ["ai_feedback_id"];
            isOneToOne: false;
            referencedRelation: "ai_feedback";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_incidents_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_incidents_handled_by_fkey";
            columns: ["handled_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_incidents_reporter_id_fkey";
            columns: ["reporter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_interactions: {
        Row: {
          activity_id: string;
          attempt_id: string;
          created_at: string;
          error_code: string | null;
          function: Database["public"]["Enums"]["ai_function"];
          id: string;
          input_tokens: number | null;
          latency_ms: number | null;
          model: string;
          output_tokens: number | null;
          prompt_template_id: string;
          purpose: string;
          request_digest: string;
          status: Database["public"]["Enums"]["ai_interaction_status"];
          student_id: string;
        };
        Insert: {
          activity_id: string;
          attempt_id: string;
          created_at?: string;
          error_code?: string | null;
          function: Database["public"]["Enums"]["ai_function"];
          id?: string;
          input_tokens?: number | null;
          latency_ms?: number | null;
          model: string;
          output_tokens?: number | null;
          prompt_template_id: string;
          purpose: string;
          request_digest: string;
          status: Database["public"]["Enums"]["ai_interaction_status"];
          student_id: string;
        };
        Update: {
          activity_id?: string;
          attempt_id?: string;
          created_at?: string;
          error_code?: string | null;
          function?: Database["public"]["Enums"]["ai_function"];
          id?: string;
          input_tokens?: number | null;
          latency_ms?: number | null;
          model?: string;
          output_tokens?: number | null;
          prompt_template_id?: string;
          purpose?: string;
          request_digest?: string;
          status?: Database["public"]["Enums"]["ai_interaction_status"];
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_interactions_activity_id_fkey";
            columns: ["activity_id"];
            isOneToOne: false;
            referencedRelation: "activities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_interactions_attempt_id_fkey";
            columns: ["attempt_id"];
            isOneToOne: false;
            referencedRelation: "attempts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_interactions_prompt_template_id_fkey";
            columns: ["prompt_template_id"];
            isOneToOne: false;
            referencedRelation: "ai_prompt_templates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_interactions_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_prompt_templates: {
        Row: {
          created_at: string;
          created_by: string;
          function: Database["public"]["Enums"]["ai_function"];
          id: string;
          is_active: boolean;
          model: string;
          organization_id: string | null;
          parameters: Json;
          system_prompt: string;
          updated_at: string;
          user_prompt_template: string;
          version: number;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          function: Database["public"]["Enums"]["ai_function"];
          id?: string;
          is_active?: boolean;
          model: string;
          organization_id?: string | null;
          parameters?: Json;
          system_prompt: string;
          updated_at?: string;
          user_prompt_template: string;
          version: number;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          function?: Database["public"]["Enums"]["ai_function"];
          id?: string;
          is_active?: boolean;
          model?: string;
          organization_id?: string | null;
          parameters?: Json;
          system_prompt?: string;
          updated_at?: string;
          user_prompt_template?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "ai_prompt_templates_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_prompt_templates_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      assessment_scores: {
        Row: {
          assessment_id: string;
          comment: string | null;
          created_at: string;
          criteria_scores: Json;
          id: string;
          is_final: boolean;
          score: number;
          scored_at: string;
          scored_by: string;
          student_id: string;
          updated_at: string;
        };
        Insert: {
          assessment_id: string;
          comment?: string | null;
          created_at?: string;
          criteria_scores?: Json;
          id?: string;
          is_final?: boolean;
          score: number;
          scored_at?: string;
          scored_by: string;
          student_id: string;
          updated_at?: string;
        };
        Update: {
          assessment_id?: string;
          comment?: string | null;
          created_at?: string;
          criteria_scores?: Json;
          id?: string;
          is_final?: boolean;
          score?: number;
          scored_at?: string;
          scored_by?: string;
          student_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assessment_scores_assessment_id_fkey";
            columns: ["assessment_id"];
            isOneToOne: false;
            referencedRelation: "assessments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assessment_scores_scored_by_fkey";
            columns: ["scored_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assessment_scores_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      assessments: {
        Row: {
          activity_id: string | null;
          assessment_type: Database["public"]["Enums"]["assessment_type"];
          class_id: string;
          closes_at: string | null;
          created_at: string;
          created_by: string;
          id: string;
          max_score: number;
          opens_at: string | null;
          rubric_id: string | null;
          title: string;
          updated_at: string;
          weight: number;
        };
        Insert: {
          activity_id?: string | null;
          assessment_type: Database["public"]["Enums"]["assessment_type"];
          class_id: string;
          closes_at?: string | null;
          created_at?: string;
          created_by: string;
          id?: string;
          max_score: number;
          opens_at?: string | null;
          rubric_id?: string | null;
          title: string;
          updated_at?: string;
          weight?: number;
        };
        Update: {
          activity_id?: string | null;
          assessment_type?: Database["public"]["Enums"]["assessment_type"];
          class_id?: string;
          closes_at?: string | null;
          created_at?: string;
          created_by?: string;
          id?: string;
          max_score?: number;
          opens_at?: string | null;
          rubric_id?: string | null;
          title?: string;
          updated_at?: string;
          weight?: number;
        };
        Relationships: [
          {
            foreignKeyName: "assessments_activity_id_fkey";
            columns: ["activity_id"];
            isOneToOne: false;
            referencedRelation: "activities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assessments_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assessments_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assessments_rubric_id_fkey";
            columns: ["rubric_id"];
            isOneToOne: false;
            referencedRelation: "rubrics";
            referencedColumns: ["id"];
          },
        ];
      };
      attempt_answers: {
        Row: {
          attempt_id: string;
          content: string;
          created_at: string;
          id: string;
          question_key: string;
          sequence: number;
        };
        Insert: {
          attempt_id: string;
          content: string;
          created_at?: string;
          id?: string;
          question_key: string;
          sequence: number;
        };
        Update: {
          attempt_id?: string;
          content?: string;
          created_at?: string;
          id?: string;
          question_key?: string;
          sequence?: number;
        };
        Relationships: [
          {
            foreignKeyName: "attempt_answers_attempt_id_fkey";
            columns: ["attempt_id"];
            isOneToOne: false;
            referencedRelation: "attempts";
            referencedColumns: ["id"];
          },
        ];
      };
      attempt_drafts: {
        Row: {
          activity_id: string;
          content: string;
          created_at: string;
          id: string;
          student_id: string;
          updated_at: string;
        };
        Insert: {
          activity_id: string;
          content?: string;
          created_at?: string;
          id?: string;
          student_id: string;
          updated_at?: string;
        };
        Update: {
          activity_id?: string;
          content?: string;
          created_at?: string;
          id?: string;
          student_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attempt_drafts_activity_id_fkey";
            columns: ["activity_id"];
            isOneToOne: false;
            referencedRelation: "activities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attempt_drafts_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      attempts: {
        Row: {
          activity_id: string;
          attempt_number: number;
          client_submission_id: string | null;
          content: string;
          content_hash: string;
          created_at: string;
          id: string;
          is_baseline: boolean;
          student_id: string;
          submitted_at: string;
          unit_version_id: string | null;
        };
        Insert: {
          activity_id: string;
          attempt_number: number;
          client_submission_id?: string | null;
          content: string;
          content_hash: string;
          created_at?: string;
          id?: string;
          is_baseline?: boolean;
          student_id: string;
          submitted_at?: string;
          unit_version_id?: string | null;
        };
        Update: {
          activity_id?: string;
          attempt_number?: number;
          client_submission_id?: string | null;
          content?: string;
          content_hash?: string;
          created_at?: string;
          id?: string;
          is_baseline?: boolean;
          student_id?: string;
          submitted_at?: string;
          unit_version_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "attempts_activity_id_fkey";
            columns: ["activity_id"];
            isOneToOne: false;
            referencedRelation: "activities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attempts_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attempts_unit_version_id_fkey";
            columns: ["unit_version_id"];
            isOneToOne: false;
            referencedRelation: "learning_unit_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      learning_unit_versions: {
        Row: {
          archived_at: string | null;
          content_hash: string;
          created_at: string;
          created_by: string;
          id: string;
          learning_unit_id: string;
          published_at: string | null;
          schema_version: number;
          snapshot_jsonb: Json;
          status: Database["public"]["Enums"]["publication_status"];
          updated_at: string;
          version_number: number;
        };
        Insert: {
          archived_at?: string | null;
          content_hash: string;
          created_at?: string;
          created_by: string;
          id?: string;
          learning_unit_id: string;
          published_at?: string | null;
          schema_version?: number;
          snapshot_jsonb: Json;
          status?: Database["public"]["Enums"]["publication_status"];
          updated_at?: string;
          version_number: number;
        };
        Update: {
          archived_at?: string | null;
          content_hash?: string;
          created_at?: string;
          created_by?: string;
          id?: string;
          learning_unit_id?: string;
          published_at?: string | null;
          schema_version?: number;
          snapshot_jsonb?: Json;
          status?: Database["public"]["Enums"]["publication_status"];
          updated_at?: string;
          version_number?: number;
        };
        Relationships: [
          {
            foreignKeyName: "learning_unit_versions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "learning_unit_versions_learning_unit_id_fkey";
            columns: ["learning_unit_id"];
            isOneToOne: false;
            referencedRelation: "learning_units";
            referencedColumns: ["id"];
          },
        ];
      };
      learning_sessions: {
        Row: {
          activity_id: string;
          created_at: string;
          end_reason: string | null;
          ended_at: string | null;
          estimated_active_seconds: number;
          heartbeat_count: number;
          id: string;
          last_heartbeat_at: string;
          started_at: string;
          student_id: string;
          updated_at: string;
        };
        Insert: {
          activity_id: string;
          created_at?: string;
          end_reason?: string | null;
          ended_at?: string | null;
          estimated_active_seconds?: number;
          heartbeat_count?: number;
          id?: string;
          last_heartbeat_at?: string;
          started_at?: string;
          student_id: string;
          updated_at?: string;
        };
        Update: {
          activity_id?: string;
          created_at?: string;
          end_reason?: string | null;
          ended_at?: string | null;
          estimated_active_seconds?: number;
          heartbeat_count?: number;
          id?: string;
          last_heartbeat_at?: string;
          started_at?: string;
          student_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "learning_sessions_activity_id_fkey";
            columns: ["activity_id"];
            isOneToOne: false;
            referencedRelation: "activities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "learning_sessions_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          actor_role: Database["public"]["Enums"]["role_key"] | null;
          after: Json | null;
          before: Json | null;
          created_at: string;
          id: string;
          ip_hash: string | null;
          subject_id: string | null;
          subject_table: string;
          user_agent_hash: string | null;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          actor_role?: Database["public"]["Enums"]["role_key"] | null;
          after?: Json | null;
          before?: Json | null;
          created_at?: string;
          id?: string;
          ip_hash?: string | null;
          subject_id?: string | null;
          subject_table: string;
          user_agent_hash?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          actor_role?: Database["public"]["Enums"]["role_key"] | null;
          after?: Json | null;
          before?: Json | null;
          created_at?: string;
          id?: string;
          ip_hash?: string | null;
          subject_id?: string | null;
          subject_table?: string;
          user_agent_hash?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      branching_decisions: {
        Row: {
          action: Database["public"]["Enums"]["branching_action"];
          activity_id: string;
          branching_rule_id: string | null;
          created_at: string;
          decided_at: string;
          decided_by: Database["public"]["Enums"]["evaluator_kind"];
          error_category_id: string | null;
          evidence: Json;
          id: string;
          reason: string;
          student_id: string;
        };
        Insert: {
          action: Database["public"]["Enums"]["branching_action"];
          activity_id: string;
          branching_rule_id?: string | null;
          created_at?: string;
          decided_at?: string;
          decided_by: Database["public"]["Enums"]["evaluator_kind"];
          error_category_id?: string | null;
          evidence?: Json;
          id?: string;
          reason: string;
          student_id: string;
        };
        Update: {
          action?: Database["public"]["Enums"]["branching_action"];
          activity_id?: string;
          branching_rule_id?: string | null;
          created_at?: string;
          decided_at?: string;
          decided_by?: Database["public"]["Enums"]["evaluator_kind"];
          error_category_id?: string | null;
          evidence?: Json;
          id?: string;
          reason?: string;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "branching_decisions_activity_id_fkey";
            columns: ["activity_id"];
            isOneToOne: false;
            referencedRelation: "activities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "branching_decisions_branching_rule_id_fkey";
            columns: ["branching_rule_id"];
            isOneToOne: false;
            referencedRelation: "branching_rules";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "branching_decisions_error_category_id_fkey";
            columns: ["error_category_id"];
            isOneToOne: false;
            referencedRelation: "error_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "branching_decisions_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      branching_rules: {
        Row: {
          action: Database["public"]["Enums"]["branching_action"];
          activity_id: string;
          condition: Json;
          created_at: string;
          created_by: string;
          error_category_id: string | null;
          explanation: string;
          id: string;
          is_active: boolean;
          priority: number;
          target_unit_id: string | null;
          updated_at: string;
        };
        Insert: {
          action: Database["public"]["Enums"]["branching_action"];
          activity_id: string;
          condition?: Json;
          created_at?: string;
          created_by: string;
          error_category_id?: string | null;
          explanation: string;
          id?: string;
          is_active?: boolean;
          priority?: number;
          target_unit_id?: string | null;
          updated_at?: string;
        };
        Update: {
          action?: Database["public"]["Enums"]["branching_action"];
          activity_id?: string;
          condition?: Json;
          created_at?: string;
          created_by?: string;
          error_category_id?: string | null;
          explanation?: string;
          id?: string;
          is_active?: boolean;
          priority?: number;
          target_unit_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "branching_rules_activity_id_fkey";
            columns: ["activity_id"];
            isOneToOne: false;
            referencedRelation: "activities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "branching_rules_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "branching_rules_error_category_id_fkey";
            columns: ["error_category_id"];
            isOneToOne: false;
            referencedRelation: "error_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "branching_rules_target_unit_id_fkey";
            columns: ["target_unit_id"];
            isOneToOne: false;
            referencedRelation: "learning_units";
            referencedColumns: ["id"];
          },
        ];
      };
      case_sources: {
        Row: {
          case_id: string;
          created_at: string;
          id: string;
          is_required: boolean;
          sequence: number;
          source_id: string;
        };
        Insert: {
          case_id: string;
          created_at?: string;
          id?: string;
          is_required?: boolean;
          sequence: number;
          source_id: string;
        };
        Update: {
          case_id?: string;
          created_at?: string;
          id?: string;
          is_required?: boolean;
          sequence?: number;
          source_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "case_sources_case_id_fkey";
            columns: ["case_id"];
            isOneToOne: false;
            referencedRelation: "cases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "case_sources_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "sources";
            referencedColumns: ["id"];
          },
        ];
      };
      cases: {
        Row: {
          body: string;
          context: string;
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          id: string;
          key_question: string;
          learning_unit_id: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          body: string;
          context: string;
          created_at?: string;
          created_by: string;
          deleted_at?: string | null;
          id?: string;
          key_question: string;
          learning_unit_id: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          body?: string;
          context?: string;
          created_at?: string;
          created_by?: string;
          deleted_at?: string | null;
          id?: string;
          key_question?: string;
          learning_unit_id?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cases_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cases_learning_unit_id_fkey";
            columns: ["learning_unit_id"];
            isOneToOne: true;
            referencedRelation: "learning_units";
            referencedColumns: ["id"];
          },
        ];
      };
      claim_source_links: {
        Row: {
          claim_id: string;
          created_at: string;
          id: string;
          link_type: Database["public"]["Enums"]["claim_link_type"];
          linked_by: string;
          note: string | null;
          source_id: string;
          source_version_id: string | null;
        };
        Insert: {
          claim_id: string;
          created_at?: string;
          id?: string;
          link_type: Database["public"]["Enums"]["claim_link_type"];
          linked_by: string;
          note?: string | null;
          source_id: string;
          source_version_id?: string | null;
        };
        Update: {
          claim_id?: string;
          created_at?: string;
          id?: string;
          link_type?: Database["public"]["Enums"]["claim_link_type"];
          linked_by?: string;
          note?: string | null;
          source_id?: string;
          source_version_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "claim_source_links_claim_id_fkey";
            columns: ["claim_id"];
            isOneToOne: false;
            referencedRelation: "claims";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "claim_source_links_linked_by_fkey";
            columns: ["linked_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "claim_source_links_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "sources";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "claim_source_links_source_version_id_fkey";
            columns: ["source_version_id"];
            isOneToOne: false;
            referencedRelation: "source_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      claims: {
        Row: {
          activity_id: string | null;
          author_id: string | null;
          case_id: string | null;
          created_at: string;
          id: string;
          origin: Database["public"]["Enums"]["claim_origin"];
          text: string;
          updated_at: string;
        };
        Insert: {
          activity_id?: string | null;
          author_id?: string | null;
          case_id?: string | null;
          created_at?: string;
          id?: string;
          origin: Database["public"]["Enums"]["claim_origin"];
          text: string;
          updated_at?: string;
        };
        Update: {
          activity_id?: string | null;
          author_id?: string | null;
          case_id?: string | null;
          created_at?: string;
          id?: string;
          origin?: Database["public"]["Enums"]["claim_origin"];
          text?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "claims_activity_id_fkey";
            columns: ["activity_id"];
            isOneToOne: false;
            referencedRelation: "activities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "claims_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "claims_case_id_fkey";
            columns: ["case_id"];
            isOneToOne: false;
            referencedRelation: "cases";
            referencedColumns: ["id"];
          },
        ];
      };
      class_lecturers: {
        Row: {
          assigned_at: string;
          assigned_by: string;
          class_id: string;
          created_at: string;
          id: string;
          lecturer_id: string;
          role_in_class: string;
        };
        Insert: {
          assigned_at?: string;
          assigned_by: string;
          class_id: string;
          created_at?: string;
          id?: string;
          lecturer_id: string;
          role_in_class?: string;
        };
        Update: {
          assigned_at?: string;
          assigned_by?: string;
          class_id?: string;
          created_at?: string;
          id?: string;
          lecturer_id?: string;
          role_in_class?: string;
        };
        Relationships: [
          {
            foreignKeyName: "class_lecturers_assigned_by_fkey";
            columns: ["assigned_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "class_lecturers_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "class_lecturers_lecturer_id_fkey";
            columns: ["lecturer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      classes: {
        Row: {
          academic_period_id: string;
          capacity: number | null;
          code: string;
          course_id: string;
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          id: string;
          name: string;
          status: Database["public"]["Enums"]["publication_status"];
          updated_at: string;
        };
        Insert: {
          academic_period_id: string;
          capacity?: number | null;
          code: string;
          course_id: string;
          created_at?: string;
          created_by: string;
          deleted_at?: string | null;
          id?: string;
          name: string;
          status?: Database["public"]["Enums"]["publication_status"];
          updated_at?: string;
        };
        Update: {
          academic_period_id?: string;
          capacity?: number | null;
          code?: string;
          course_id?: string;
          created_at?: string;
          created_by?: string;
          deleted_at?: string | null;
          id?: string;
          name?: string;
          status?: Database["public"]["Enums"]["publication_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "classes_academic_period_id_fkey";
            columns: ["academic_period_id"];
            isOneToOne: false;
            referencedRelation: "academic_periods";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "classes_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "classes_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      consent_records: {
        Row: {
          consented_at: string | null;
          created_at: string;
          document_version: string;
          id: string;
          profile_id: string;
          status: Database["public"]["Enums"]["consent_status"];
          study_key: string;
          updated_at: string;
          withdrawn_at: string | null;
        };
        Insert: {
          consented_at?: string | null;
          created_at?: string;
          document_version: string;
          id?: string;
          profile_id: string;
          status: Database["public"]["Enums"]["consent_status"];
          study_key: string;
          updated_at?: string;
          withdrawn_at?: string | null;
        };
        Update: {
          consented_at?: string | null;
          created_at?: string;
          document_version?: string;
          id?: string;
          profile_id?: string;
          status?: Database["public"]["Enums"]["consent_status"];
          study_key?: string;
          updated_at?: string;
          withdrawn_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "consent_records_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      courses: {
        Row: {
          code: string;
          created_at: string;
          created_by: string;
          credits: number;
          deleted_at: string | null;
          description: string | null;
          id: string;
          name: string;
          organization_id: string;
          study_program_id: string;
          updated_at: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          created_by: string;
          credits: number;
          deleted_at?: string | null;
          description?: string | null;
          id?: string;
          name: string;
          organization_id: string;
          study_program_id: string;
          updated_at?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          created_by?: string;
          credits?: number;
          deleted_at?: string | null;
          description?: string | null;
          id?: string;
          name?: string;
          organization_id?: string;
          study_program_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "courses_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "courses_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "courses_study_program_id_fkey";
            columns: ["study_program_id"];
            isOneToOne: false;
            referencedRelation: "study_programs";
            referencedColumns: ["id"];
          },
        ];
      };
      critical_thinking_scores: {
        Row: {
          assessment_id: string | null;
          class_id: string;
          created_at: string;
          dimension: Database["public"]["Enums"]["ct_dimension"];
          id: string;
          measured_at: string;
          measurement_source: string;
          score: number;
          student_id: string;
        };
        Insert: {
          assessment_id?: string | null;
          class_id: string;
          created_at?: string;
          dimension: Database["public"]["Enums"]["ct_dimension"];
          id?: string;
          measured_at?: string;
          measurement_source: string;
          score: number;
          student_id: string;
        };
        Update: {
          assessment_id?: string | null;
          class_id?: string;
          created_at?: string;
          dimension?: Database["public"]["Enums"]["ct_dimension"];
          id?: string;
          measured_at?: string;
          measurement_source?: string;
          score?: number;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "critical_thinking_scores_assessment_id_fkey";
            columns: ["assessment_id"];
            isOneToOne: false;
            referencedRelation: "assessments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "critical_thinking_scores_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "critical_thinking_scores_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      data_retention_rules: {
        Row: {
          action: Database["public"]["Enums"]["retention_action"];
          created_at: string;
          domain_key: string;
          id: string;
          is_active: boolean;
          organization_id: string;
          retention_days: number;
          updated_at: string;
        };
        Insert: {
          action: Database["public"]["Enums"]["retention_action"];
          created_at?: string;
          domain_key: string;
          id?: string;
          is_active?: boolean;
          organization_id: string;
          retention_days: number;
          updated_at?: string;
        };
        Update: {
          action?: Database["public"]["Enums"]["retention_action"];
          created_at?: string;
          domain_key?: string;
          id?: string;
          is_active?: boolean;
          organization_id?: string;
          retention_days?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "data_retention_rules_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      enrichment_units: {
        Row: {
          created_at: string;
          created_by: string;
          description: string;
          id: string;
          learning_unit_id: string;
          title: string;
          trigger_criteria: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          description: string;
          id?: string;
          learning_unit_id: string;
          title: string;
          trigger_criteria: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          description?: string;
          id?: string;
          learning_unit_id?: string;
          title?: string;
          trigger_criteria?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "enrichment_units_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "enrichment_units_learning_unit_id_fkey";
            columns: ["learning_unit_id"];
            isOneToOne: false;
            referencedRelation: "learning_units";
            referencedColumns: ["id"];
          },
        ];
      };
      enrollments: {
        Row: {
          class_id: string;
          created_at: string;
          enrolled_at: string;
          enrolled_by: string;
          id: string;
          status: Database["public"]["Enums"]["enrollment_status"];
          student_id: string;
          updated_at: string;
        };
        Insert: {
          class_id: string;
          created_at?: string;
          enrolled_at?: string;
          enrolled_by: string;
          id?: string;
          status?: Database["public"]["Enums"]["enrollment_status"];
          student_id: string;
          updated_at?: string;
        };
        Update: {
          class_id?: string;
          created_at?: string;
          enrolled_at?: string;
          enrolled_by?: string;
          id?: string;
          status?: Database["public"]["Enums"]["enrollment_status"];
          student_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "enrollments_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "enrollments_enrolled_by_fkey";
            columns: ["enrolled_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "enrollments_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      error_categories: {
        Row: {
          created_at: string;
          description: string;
          dimension: Database["public"]["Enums"]["ct_dimension"] | null;
          id: string;
          key: string;
          name: string;
          organization_id: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description: string;
          dimension?: Database["public"]["Enums"]["ct_dimension"] | null;
          id?: string;
          key: string;
          name: string;
          organization_id?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          dimension?: Database["public"]["Enums"]["ct_dimension"] | null;
          id?: string;
          key?: string;
          name?: string;
          organization_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "error_categories_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      faculties: {
        Row: {
          code: string;
          created_at: string;
          id: string;
          name: string;
          organization_id: string;
          updated_at: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          id?: string;
          name: string;
          organization_id: string;
          updated_at?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          id?: string;
          name?: string;
          organization_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "faculties_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      feedback_records: {
        Row: {
          ai_interaction_id: string | null;
          attempt_id: string | null;
          author_id: string | null;
          content: string;
          created_at: string;
          id: string;
          revision_id: string | null;
          rubric_id: string | null;
          source: Database["public"]["Enums"]["feedback_source"];
        };
        Insert: {
          ai_interaction_id?: string | null;
          attempt_id?: string | null;
          author_id?: string | null;
          content: string;
          created_at?: string;
          id?: string;
          revision_id?: string | null;
          rubric_id?: string | null;
          source: Database["public"]["Enums"]["feedback_source"];
        };
        Update: {
          ai_interaction_id?: string | null;
          attempt_id?: string | null;
          author_id?: string | null;
          content?: string;
          created_at?: string;
          id?: string;
          revision_id?: string | null;
          rubric_id?: string | null;
          source?: Database["public"]["Enums"]["feedback_source"];
        };
        Relationships: [
          {
            foreignKeyName: "feedback_records_attempt_id_fkey";
            columns: ["attempt_id"];
            isOneToOne: false;
            referencedRelation: "attempts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "feedback_records_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "feedback_records_revision_id_fkey";
            columns: ["revision_id"];
            isOneToOne: false;
            referencedRelation: "revisions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "feedback_records_rubric_id_fkey";
            columns: ["rubric_id"];
            isOneToOne: false;
            referencedRelation: "rubrics";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_feedback_records_ai_interaction";
            columns: ["ai_interaction_id"];
            isOneToOne: false;
            referencedRelation: "ai_interactions";
            referencedColumns: ["id"];
          },
        ];
      };
      fidelity_records: {
        Row: {
          checklist_key: string;
          class_id: string;
          created_at: string;
          id: string;
          is_implemented: boolean;
          note: string | null;
          observation_date: string;
          observed_by: string;
          updated_at: string;
        };
        Insert: {
          checklist_key: string;
          class_id: string;
          created_at?: string;
          id?: string;
          is_implemented: boolean;
          note?: string | null;
          observation_date: string;
          observed_by: string;
          updated_at?: string;
        };
        Update: {
          checklist_key?: string;
          class_id?: string;
          created_at?: string;
          id?: string;
          is_implemented?: boolean;
          note?: string | null;
          observation_date?: string;
          observed_by?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fidelity_records_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fidelity_records_observed_by_fkey";
            columns: ["observed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      learning_events: {
        Row: {
          activity_id: string | null;
          class_id: string;
          created_at: string;
          event_type: string;
          id: string;
          occurred_at: string;
          payload: Json;
          student_id: string;
        };
        Insert: {
          activity_id?: string | null;
          class_id: string;
          created_at?: string;
          event_type: string;
          id?: string;
          occurred_at?: string;
          payload?: Json;
          student_id: string;
        };
        Update: {
          activity_id?: string | null;
          class_id?: string;
          created_at?: string;
          event_type?: string;
          id?: string;
          occurred_at?: string;
          payload?: Json;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "learning_events_activity_id_fkey";
            columns: ["activity_id"];
            isOneToOne: false;
            referencedRelation: "activities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "learning_events_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "learning_events_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      learning_resources: {
        Row: {
          activity_id: string | null;
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          id: string;
          learning_unit_id: string | null;
          resource_type: string;
          storage_path: string | null;
          title: string;
          updated_at: string;
          url: string | null;
        };
        Insert: {
          activity_id?: string | null;
          created_at?: string;
          created_by: string;
          deleted_at?: string | null;
          id?: string;
          learning_unit_id?: string | null;
          resource_type: string;
          storage_path?: string | null;
          title: string;
          updated_at?: string;
          url?: string | null;
        };
        Update: {
          activity_id?: string | null;
          created_at?: string;
          created_by?: string;
          deleted_at?: string | null;
          id?: string;
          learning_unit_id?: string | null;
          resource_type?: string;
          storage_path?: string | null;
          title?: string;
          updated_at?: string;
          url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "learning_resources_activity_id_fkey";
            columns: ["activity_id"];
            isOneToOne: false;
            referencedRelation: "activities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "learning_resources_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "learning_resources_learning_unit_id_fkey";
            columns: ["learning_unit_id"];
            isOneToOne: false;
            referencedRelation: "learning_units";
            referencedColumns: ["id"];
          },
        ];
      };
      learning_stages: {
        Row: {
          created_at: string;
          focus: string;
          id: string;
          is_enabled: boolean;
          learning_unit_id: string;
          sequence: number;
          stage_key: Database["public"]["Enums"]["stage_key"];
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          focus: string;
          id?: string;
          is_enabled?: boolean;
          learning_unit_id: string;
          sequence: number;
          stage_key: Database["public"]["Enums"]["stage_key"];
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          focus?: string;
          id?: string;
          is_enabled?: boolean;
          learning_unit_id?: string;
          sequence?: number;
          stage_key?: Database["public"]["Enums"]["stage_key"];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "learning_stages_learning_unit_id_fkey";
            columns: ["learning_unit_id"];
            isOneToOne: false;
            referencedRelation: "learning_units";
            referencedColumns: ["id"];
          },
        ];
      };
      learning_units: {
        Row: {
          closes_at: string | null;
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          id: string;
          module_id: string;
          objective: string;
          opens_at: string | null;
          sequence: number;
          status: Database["public"]["Enums"]["publication_status"];
          title: string;
          unit_kind: string;
          updated_at: string;
        };
        Insert: {
          closes_at?: string | null;
          created_at?: string;
          created_by: string;
          deleted_at?: string | null;
          id?: string;
          module_id: string;
          objective: string;
          opens_at?: string | null;
          sequence: number;
          status?: Database["public"]["Enums"]["publication_status"];
          title: string;
          unit_kind?: string;
          updated_at?: string;
        };
        Update: {
          closes_at?: string | null;
          created_at?: string;
          created_by?: string;
          deleted_at?: string | null;
          id?: string;
          module_id?: string;
          objective?: string;
          opens_at?: string | null;
          sequence?: number;
          status?: Database["public"]["Enums"]["publication_status"];
          title?: string;
          unit_kind?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "learning_units_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "learning_units_module_id_fkey";
            columns: ["module_id"];
            isOneToOne: false;
            referencedRelation: "modules";
            referencedColumns: ["id"];
          },
        ];
      };
      lecturer_overrides: {
        Row: {
          created_at: string;
          id: string;
          lecturer_id: string;
          new_value: Json;
          previous_value: Json;
          reason: string;
          subject_id: string;
          subject_kind: Database["public"]["Enums"]["override_subject"];
        };
        Insert: {
          created_at?: string;
          id?: string;
          lecturer_id: string;
          new_value: Json;
          previous_value: Json;
          reason: string;
          subject_id: string;
          subject_kind: Database["public"]["Enums"]["override_subject"];
        };
        Update: {
          created_at?: string;
          id?: string;
          lecturer_id?: string;
          new_value?: Json;
          previous_value?: Json;
          reason?: string;
          subject_id?: string;
          subject_kind?: Database["public"]["Enums"]["override_subject"];
        };
        Relationships: [
          {
            foreignKeyName: "lecturer_overrides_lecturer_id_fkey";
            columns: ["lecturer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      mastery_results: {
        Row: {
          activity_id: string;
          created_at: string;
          criteria_scores: Json;
          decided_at: string;
          evaluator_id: string | null;
          evaluator_kind: Database["public"]["Enums"]["evaluator_kind"];
          id: string;
          is_final: boolean;
          outcome: Database["public"]["Enums"]["mastery_outcome"];
          rubric_id: string | null;
          score: number | null;
          student_id: string;
        };
        Insert: {
          activity_id: string;
          created_at?: string;
          criteria_scores?: Json;
          decided_at?: string;
          evaluator_id?: string | null;
          evaluator_kind: Database["public"]["Enums"]["evaluator_kind"];
          id?: string;
          is_final?: boolean;
          outcome: Database["public"]["Enums"]["mastery_outcome"];
          rubric_id?: string | null;
          score?: number | null;
          student_id: string;
        };
        Update: {
          activity_id?: string;
          created_at?: string;
          criteria_scores?: Json;
          decided_at?: string;
          evaluator_id?: string | null;
          evaluator_kind?: Database["public"]["Enums"]["evaluator_kind"];
          id?: string;
          is_final?: boolean;
          outcome?: Database["public"]["Enums"]["mastery_outcome"];
          rubric_id?: string | null;
          score?: number | null;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mastery_results_activity_id_fkey";
            columns: ["activity_id"];
            isOneToOne: false;
            referencedRelation: "activities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mastery_results_evaluator_id_fkey";
            columns: ["evaluator_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mastery_results_rubric_id_fkey";
            columns: ["rubric_id"];
            isOneToOne: false;
            referencedRelation: "rubrics";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mastery_results_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      modules: {
        Row: {
          class_id: string;
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          description: string | null;
          id: string;
          sequence: number;
          status: Database["public"]["Enums"]["publication_status"];
          title: string;
          updated_at: string;
        };
        Insert: {
          class_id: string;
          created_at?: string;
          created_by: string;
          deleted_at?: string | null;
          description?: string | null;
          id?: string;
          sequence: number;
          status?: Database["public"]["Enums"]["publication_status"];
          title: string;
          updated_at?: string;
        };
        Update: {
          class_id?: string;
          created_at?: string;
          created_by?: string;
          deleted_at?: string | null;
          description?: string | null;
          id?: string;
          sequence?: number;
          status?: Database["public"]["Enums"]["publication_status"];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "modules_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "modules_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          kind: string;
          link_path: string | null;
          read_at: string | null;
          recipient_id: string;
          title: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          kind: string;
          link_path?: string | null;
          read_at?: string | null;
          recipient_id: string;
          title: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          kind?: string;
          link_path?: string | null;
          read_at?: string | null;
          recipient_id?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey";
            columns: ["recipient_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          code: string;
          created_at: string;
          id: string;
          is_active: boolean;
          kind: string;
          name: string;
          timezone: string;
          updated_at: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          kind?: string;
          name: string;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          kind?: string;
          name?: string;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_path: string | null;
          created_at: string;
          full_name: string;
          id: string;
          identifier: string;
          is_active: boolean;
          organization_id: string;
          study_program_id: string | null;
          updated_at: string;
        };
        Insert: {
          avatar_path?: string | null;
          created_at?: string;
          full_name: string;
          id: string;
          identifier: string;
          is_active?: boolean;
          organization_id: string;
          study_program_id?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar_path?: string | null;
          created_at?: string;
          full_name?: string;
          id?: string;
          identifier?: string;
          is_active?: boolean;
          organization_id?: string;
          study_program_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_study_program_id_fkey";
            columns: ["study_program_id"];
            isOneToOne: false;
            referencedRelation: "study_programs";
            referencedColumns: ["id"];
          },
        ];
      };
      reflections: {
        Row: {
          activity_id: string;
          ai_accepted: string;
          ai_rejected: string;
          attempt_id: string;
          bias_found: string;
          change_reason: string;
          created_at: string;
          feedback_summary: string;
          final_summary: string;
          id: string;
          initial_summary: string;
          next_strategy: string;
          revision_id: string | null;
          student_id: string;
          submitted_at: string;
          verified_sources_summary: string;
        };
        Insert: {
          activity_id: string;
          ai_accepted: string;
          ai_rejected: string;
          attempt_id: string;
          bias_found: string;
          change_reason: string;
          created_at?: string;
          feedback_summary: string;
          final_summary: string;
          id?: string;
          initial_summary: string;
          next_strategy: string;
          revision_id?: string | null;
          student_id: string;
          submitted_at?: string;
          verified_sources_summary: string;
        };
        Update: {
          activity_id?: string;
          ai_accepted?: string;
          ai_rejected?: string;
          attempt_id?: string;
          bias_found?: string;
          change_reason?: string;
          created_at?: string;
          feedback_summary?: string;
          final_summary?: string;
          id?: string;
          initial_summary?: string;
          next_strategy?: string;
          revision_id?: string | null;
          student_id?: string;
          submitted_at?: string;
          verified_sources_summary?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reflections_activity_id_fkey";
            columns: ["activity_id"];
            isOneToOne: false;
            referencedRelation: "activities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reflections_attempt_id_fkey";
            columns: ["attempt_id"];
            isOneToOne: false;
            referencedRelation: "attempts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reflections_revision_id_fkey";
            columns: ["revision_id"];
            isOneToOne: false;
            referencedRelation: "revisions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reflections_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      remedial_units: {
        Row: {
          created_at: string;
          created_by: string;
          description: string;
          error_category_id: string;
          id: string;
          learning_unit_id: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          description: string;
          error_category_id: string;
          id?: string;
          learning_unit_id: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          description?: string;
          error_category_id?: string;
          id?: string;
          learning_unit_id?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "remedial_units_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "remedial_units_error_category_id_fkey";
            columns: ["error_category_id"];
            isOneToOne: false;
            referencedRelation: "error_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "remedial_units_learning_unit_id_fkey";
            columns: ["learning_unit_id"];
            isOneToOne: false;
            referencedRelation: "learning_units";
            referencedColumns: ["id"];
          },
        ];
      };
      revision_reasons: {
        Row: {
          ai_feedback_id: string | null;
          created_at: string;
          detail: string;
          id: string;
          reason_type: string;
          revision_id: string;
        };
        Insert: {
          ai_feedback_id?: string | null;
          created_at?: string;
          detail: string;
          id?: string;
          reason_type: string;
          revision_id: string;
        };
        Update: {
          ai_feedback_id?: string | null;
          created_at?: string;
          detail?: string;
          id?: string;
          reason_type?: string;
          revision_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fk_revision_reasons_ai_feedback";
            columns: ["ai_feedback_id"];
            isOneToOne: false;
            referencedRelation: "ai_feedback";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "revision_reasons_revision_id_fkey";
            columns: ["revision_id"];
            isOneToOne: false;
            referencedRelation: "revisions";
            referencedColumns: ["id"];
          },
        ];
      };
      revisions: {
        Row: {
          attempt_id: string;
          client_submission_id: string | null;
          content: string;
          created_at: string;
          id: string;
          revision_number: number;
          student_id: string;
          submitted_at: string;
        };
        Insert: {
          attempt_id: string;
          client_submission_id?: string | null;
          content: string;
          created_at?: string;
          id?: string;
          revision_number: number;
          student_id: string;
          submitted_at?: string;
        };
        Update: {
          attempt_id?: string;
          client_submission_id?: string | null;
          content?: string;
          created_at?: string;
          id?: string;
          revision_number?: number;
          student_id?: string;
          submitted_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "revisions_attempt_id_fkey";
            columns: ["attempt_id"];
            isOneToOne: false;
            referencedRelation: "attempts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "revisions_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      role_assignments: {
        Row: {
          created_at: string;
          granted_at: string;
          granted_by: string;
          id: string;
          organization_id: string;
          profile_id: string;
          revoked_at: string | null;
          revoked_by: string | null;
          role_id: string;
        };
        Insert: {
          created_at?: string;
          granted_at?: string;
          granted_by: string;
          id?: string;
          organization_id: string;
          profile_id: string;
          revoked_at?: string | null;
          revoked_by?: string | null;
          role_id: string;
        };
        Update: {
          created_at?: string;
          granted_at?: string;
          granted_by?: string;
          id?: string;
          organization_id?: string;
          profile_id?: string;
          revoked_at?: string | null;
          revoked_by?: string | null;
          role_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "role_assignments_granted_by_fkey";
            columns: ["granted_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "role_assignments_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "role_assignments_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "role_assignments_revoked_by_fkey";
            columns: ["revoked_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "role_assignments_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
        ];
      };
      roles: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          key: Database["public"]["Enums"]["role_key"];
          name: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          key: Database["public"]["Enums"]["role_key"];
          name: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          key?: Database["public"]["Enums"]["role_key"];
          name?: string;
        };
        Relationships: [];
      };
      rubric_criteria: {
        Row: {
          code: string;
          created_at: string;
          description: string;
          dimension: Database["public"]["Enums"]["ct_dimension"];
          id: string;
          rubric_id: string;
          sequence: number;
          updated_at: string;
          weight: number;
        };
        Insert: {
          code: string;
          created_at?: string;
          description: string;
          dimension: Database["public"]["Enums"]["ct_dimension"];
          id?: string;
          rubric_id: string;
          sequence: number;
          updated_at?: string;
          weight: number;
        };
        Update: {
          code?: string;
          created_at?: string;
          description?: string;
          dimension?: Database["public"]["Enums"]["ct_dimension"];
          id?: string;
          rubric_id?: string;
          sequence?: number;
          updated_at?: string;
          weight?: number;
        };
        Relationships: [
          {
            foreignKeyName: "rubric_criteria_rubric_id_fkey";
            columns: ["rubric_id"];
            isOneToOne: false;
            referencedRelation: "rubrics";
            referencedColumns: ["id"];
          },
        ];
      };
      rubric_levels: {
        Row: {
          created_at: string;
          descriptor: string;
          id: string;
          label: string;
          level_order: number;
          rubric_criterion_id: string;
          score: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          descriptor: string;
          id?: string;
          label: string;
          level_order: number;
          rubric_criterion_id: string;
          score: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          descriptor?: string;
          id?: string;
          label?: string;
          level_order?: number;
          rubric_criterion_id?: string;
          score?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rubric_levels_rubric_criterion_id_fkey";
            columns: ["rubric_criterion_id"];
            isOneToOne: false;
            referencedRelation: "rubric_criteria";
            referencedColumns: ["id"];
          },
        ];
      };
      rubrics: {
        Row: {
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          description: string | null;
          id: string;
          is_template: boolean;
          organization_id: string;
          status: Database["public"]["Enums"]["publication_status"];
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          deleted_at?: string | null;
          description?: string | null;
          id?: string;
          is_template?: boolean;
          organization_id: string;
          status?: Database["public"]["Enums"]["publication_status"];
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          deleted_at?: string | null;
          description?: string | null;
          id?: string;
          is_template?: boolean;
          organization_id?: string;
          status?: Database["public"]["Enums"]["publication_status"];
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rubrics_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rubrics_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      source_chunks: {
        Row: {
          chunk_index: number;
          content: string;
          created_at: string;
          embedded_at: string | null;
          embedding: string | null;
          id: string;
          source_version_id: string;
          token_count: number | null;
        };
        Insert: {
          chunk_index: number;
          content: string;
          created_at?: string;
          embedded_at?: string | null;
          embedding?: string | null;
          id?: string;
          source_version_id: string;
          token_count?: number | null;
        };
        Update: {
          chunk_index?: number;
          content?: string;
          created_at?: string;
          embedded_at?: string | null;
          embedding?: string | null;
          id?: string;
          source_version_id?: string;
          token_count?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "source_chunks_source_version_id_fkey";
            columns: ["source_version_id"];
            isOneToOne: false;
            referencedRelation: "source_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      source_files: {
        Row: {
          created_at: string;
          id: string;
          mime_type: string;
          original_filename: string;
          size_bytes: number;
          source_version_id: string;
          storage_bucket: string;
          storage_path: string;
          uploaded_by: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          mime_type: string;
          original_filename: string;
          size_bytes: number;
          source_version_id: string;
          storage_bucket?: string;
          storage_path: string;
          uploaded_by: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          mime_type?: string;
          original_filename?: string;
          size_bytes?: number;
          source_version_id?: string;
          storage_bucket?: string;
          storage_path?: string;
          uploaded_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "source_files_source_version_id_fkey";
            columns: ["source_version_id"];
            isOneToOne: false;
            referencedRelation: "source_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "source_files_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      source_verifications: {
        Row: {
          activity_id: string;
          checklist: Json;
          created_at: string;
          id: string;
          note: string;
          source_id: string;
          source_version_id: string | null;
          student_id: string;
          verdict: Database["public"]["Enums"]["verification_verdict"];
        };
        Insert: {
          activity_id: string;
          checklist?: Json;
          created_at?: string;
          id?: string;
          note: string;
          source_id: string;
          source_version_id?: string | null;
          student_id: string;
          verdict: Database["public"]["Enums"]["verification_verdict"];
        };
        Update: {
          activity_id?: string;
          checklist?: Json;
          created_at?: string;
          id?: string;
          note?: string;
          source_id?: string;
          source_version_id?: string | null;
          student_id?: string;
          verdict?: Database["public"]["Enums"]["verification_verdict"];
        };
        Relationships: [
          {
            foreignKeyName: "source_verifications_activity_id_fkey";
            columns: ["activity_id"];
            isOneToOne: false;
            referencedRelation: "activities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "source_verifications_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "sources";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "source_verifications_source_version_id_fkey";
            columns: ["source_version_id"];
            isOneToOne: false;
            referencedRelation: "source_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "source_verifications_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      source_versions: {
        Row: {
          checksum: string | null;
          content_text: string | null;
          created_at: string;
          created_by: string;
          id: string;
          notes: string | null;
          retrieved_at: string;
          source_id: string;
          updated_at: string;
          version_label: string;
        };
        Insert: {
          checksum?: string | null;
          content_text?: string | null;
          created_at?: string;
          created_by: string;
          id?: string;
          notes?: string | null;
          retrieved_at: string;
          source_id: string;
          updated_at?: string;
          version_label: string;
        };
        Update: {
          checksum?: string | null;
          content_text?: string | null;
          created_at?: string;
          created_by?: string;
          id?: string;
          notes?: string | null;
          retrieved_at?: string;
          source_id?: string;
          updated_at?: string;
          version_label?: string;
        };
        Relationships: [
          {
            foreignKeyName: "source_versions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "source_versions_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "sources";
            referencedColumns: ["id"];
          },
        ];
      };
      sources: {
        Row: {
          authors: string | null;
          created_at: string;
          created_by: string;
          curation_note: string | null;
          deleted_at: string | null;
          id: string;
          is_curated: boolean;
          language: string;
          organization_id: string;
          published_at: string | null;
          publisher: string | null;
          source_type: Database["public"]["Enums"]["source_type"];
          title: string;
          updated_at: string;
          url: string | null;
        };
        Insert: {
          authors?: string | null;
          created_at?: string;
          created_by: string;
          curation_note?: string | null;
          deleted_at?: string | null;
          id?: string;
          is_curated?: boolean;
          language?: string;
          organization_id: string;
          published_at?: string | null;
          publisher?: string | null;
          source_type: Database["public"]["Enums"]["source_type"];
          title: string;
          updated_at?: string;
          url?: string | null;
        };
        Update: {
          authors?: string | null;
          created_at?: string;
          created_by?: string;
          curation_note?: string | null;
          deleted_at?: string | null;
          id?: string;
          is_curated?: boolean;
          language?: string;
          organization_id?: string;
          published_at?: string | null;
          publisher?: string | null;
          source_type?: Database["public"]["Enums"]["source_type"];
          title?: string;
          updated_at?: string;
          url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "sources_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sources_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      study_programs: {
        Row: {
          code: string;
          created_at: string;
          degree_level: string;
          faculty_id: string;
          id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          degree_level: string;
          faculty_id: string;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          degree_level?: string;
          faculty_id?: string;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "study_programs_faculty_id_fkey";
            columns: ["faculty_id"];
            isOneToOne: false;
            referencedRelation: "faculties";
            referencedColumns: ["id"];
          },
        ];
      };
      verifications: {
        Row: {
          activity_id: string;
          created_at: string;
          evidence_source_id: string | null;
          id: string;
          note: string;
          outcome: Database["public"]["Enums"]["verification_outcome"];
          student_id: string;
          subject_id: string;
          subject_kind: string;
        };
        Insert: {
          activity_id: string;
          created_at?: string;
          evidence_source_id?: string | null;
          id?: string;
          note: string;
          outcome: Database["public"]["Enums"]["verification_outcome"];
          student_id: string;
          subject_id: string;
          subject_kind: string;
        };
        Update: {
          activity_id?: string;
          created_at?: string;
          evidence_source_id?: string | null;
          id?: string;
          note?: string;
          outcome?: Database["public"]["Enums"]["verification_outcome"];
          student_id?: string;
          subject_id?: string;
          subject_kind?: string;
        };
        Relationships: [
          {
            foreignKeyName: "verifications_activity_id_fkey";
            columns: ["activity_id"];
            isOneToOne: false;
            referencedRelation: "activities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "verifications_evidence_source_id_fkey";
            columns: ["evidence_source_id"];
            isOneToOne: false;
            referencedRelation: "sources";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "verifications_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      build_unit_snapshot: { Args: { p_unit_id: string }; Returns: Json };
      unit_snapshot_hash: { Args: { p_snapshot: Json }; Returns: string };
      publish_unit_version: { Args: { p_unit_id: string }; Returns: string };
      resolve_unit_version: {
        Args: { p_unit_id: string; p_student_id: string };
        Returns: string;
      };
      close_stale_learning_sessions: {
        Args: { p_idle_minutes?: number; p_max_hours?: number };
        Returns: number;
      };
      can_access_activity: {
        Args: { p_activity_id: string };
        Returns: boolean;
      };
      can_student_read_activity: {
        Args: { p_activity_id: string };
        Returns: boolean;
      };
      class_of_activity: { Args: { p_activity_id: string }; Returns: string };
      class_of_learning_unit: { Args: { p_unit_id: string }; Returns: string };
      class_of_module: { Args: { p_module_id: string }; Returns: string };
      class_of_stage: { Args: { p_stage_id: string }; Returns: string };
      current_organization_id: { Args: never; Returns: string };
      current_profile_id: { Args: never; Returns: string };
      export_ai_usage: {
        Args: never;
        Returns: {
          accepted_count: number;
          function: Database["public"]["Enums"]["ai_function"];
          interaction_count: number;
          pseudonym: string;
          reported_count: number;
          status: Database["public"]["Enums"]["ai_interaction_status"];
        }[];
      };
      export_attempt_metrics: {
        Args: never;
        Returns: {
          activity_id: string;
          attempt_submitted_at: string;
          first_revision_at: string | null;
          pseudonym: string;
          revision_count: number;
        }[];
      };
      export_ct_scores: {
        Args: never;
        Returns: {
          dimension: Database["public"]["Enums"]["ct_dimension"];
          measured_at: string;
          measurement_source: string;
          pseudonym: string;
          score: number;
        }[];
      };
      has_role: {
        Args: { target: Database["public"]["Enums"]["role_key"] };
        Returns: boolean;
      };
      is_admin: { Args: never; Returns: boolean };
      is_enrolled_in_class: { Args: { p_class_id: string }; Returns: boolean };
      is_lecturer_of_class: { Args: { p_class_id: string }; Returns: boolean };
      match_source_chunks: {
        Args: {
          p_activity_id: string;
          p_match_count?: number;
          p_query: string;
        };
        Returns: {
          chunk_id: string;
          chunk_index: number;
          content: string;
          similarity: number;
          source_id: string;
          source_title: string;
          source_version_id: string;
        }[];
      };
      pending_embedding_count: { Args: never; Returns: number };
      register_research_participant: {
        Args: {
          p_consent_record_id: string;
          p_profile_id: string;
          p_pseudonym: string;
        };
        Returns: undefined;
      };
      remove_research_participant: {
        Args: { p_profile_id: string };
        Returns: undefined;
      };
      research_participant_count: { Args: never; Returns: number };
    };
    Enums: {
      ai_function:
        | "guiding_questions"
        | "rubric_feedback"
        | "hint"
        | "counter_argument"
        | "error_classification"
        | "learning_path";
      ai_interaction_status:
        | "success"
        | "schema_rejected"
        | "safety_rejected"
        | "provider_error";
      ai_student_action: "pending" | "accepted" | "ignored" | "reported";
      assessment_type: "formative" | "summative" | "pretest" | "posttest";
      branching_action: "remedial" | "enrichment" | "continue" | "hold";
      claim_link_type: "supports" | "refutes" | "contextualizes";
      claim_origin: "case" | "student" | "ai";
      consent_status: "granted" | "declined" | "withdrawn";
      ct_dimension:
        | "interpretation"
        | "analysis"
        | "evaluation"
        | "inference"
        | "explanation"
        | "self_regulation";
      cycle_phase: "attempt" | "feedback" | "verify" | "revise" | "mastery";
      enrollment_status: "active" | "dropped" | "completed";
      evaluator_kind: "system" | "lecturer";
      feedback_source: "ai" | "lecturer";
      incident_status: "open" | "reviewing" | "resolved" | "dismissed";
      mastery_outcome: "not_met" | "partially_met" | "met";
      override_subject:
        | "mastery_result"
        | "branching_decision"
        | "assessment_score"
        | "ai_feedback";
      publication_status: "draft" | "published" | "archived";
      retention_action: "anonymize" | "delete";
      role_key: "student" | "lecturer" | "admin";
      source_type:
        | "regulation"
        | "official_document"
        | "journal_article"
        | "book"
        | "news"
        | "report"
        | "dataset"
        | "other";
      stage_key:
        | "interpretation"
        | "analysis"
        | "evaluation"
        | "inference"
        | "explanation"
        | "reflection";
      verification_outcome: "verified" | "not_verified" | "contradicted";
      verification_verdict: "credible" | "questionable" | "not_usable";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      ai_function: [
        "guiding_questions",
        "rubric_feedback",
        "hint",
        "counter_argument",
        "error_classification",
        "learning_path",
      ],
      ai_interaction_status: [
        "success",
        "schema_rejected",
        "safety_rejected",
        "provider_error",
      ],
      ai_student_action: ["pending", "accepted", "ignored", "reported"],
      assessment_type: ["formative", "summative", "pretest", "posttest"],
      branching_action: ["remedial", "enrichment", "continue", "hold"],
      claim_link_type: ["supports", "refutes", "contextualizes"],
      claim_origin: ["case", "student", "ai"],
      consent_status: ["granted", "declined", "withdrawn"],
      ct_dimension: [
        "interpretation",
        "analysis",
        "evaluation",
        "inference",
        "explanation",
        "self_regulation",
      ],
      cycle_phase: ["attempt", "feedback", "verify", "revise", "mastery"],
      enrollment_status: ["active", "dropped", "completed"],
      evaluator_kind: ["system", "lecturer"],
      feedback_source: ["ai", "lecturer"],
      incident_status: ["open", "reviewing", "resolved", "dismissed"],
      mastery_outcome: ["not_met", "partially_met", "met"],
      override_subject: [
        "mastery_result",
        "branching_decision",
        "assessment_score",
        "ai_feedback",
      ],
      publication_status: ["draft", "published", "archived"],
      retention_action: ["anonymize", "delete"],
      role_key: ["student", "lecturer", "admin"],
      source_type: [
        "regulation",
        "official_document",
        "journal_article",
        "book",
        "news",
        "report",
        "dataset",
        "other",
      ],
      stage_key: [
        "interpretation",
        "analysis",
        "evaluation",
        "inference",
        "explanation",
        "reflection",
      ],
      verification_outcome: ["verified", "not_verified", "contradicted"],
      verification_verdict: ["credible", "questionable", "not_usable"],
    },
  },
} as const;
