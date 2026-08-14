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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          actor_role: string | null
          created_at: string
          id: string
          metadata: Json
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          attachment: Json | null
          created_at: string
          hidden_at: string | null
          hidden_by: string | null
          hidden_reason: string | null
          id: string
          is_hidden: boolean
          message: string
          reply_to: string | null
          room_id: string
          sender_email: string
          sender_id: string
          sender_name: string | null
          sender_role: string | null
        }
        Insert: {
          attachment?: Json | null
          created_at?: string
          hidden_at?: string | null
          hidden_by?: string | null
          hidden_reason?: string | null
          id?: string
          is_hidden?: boolean
          message: string
          reply_to?: string | null
          room_id: string
          sender_email: string
          sender_id: string
          sender_name?: string | null
          sender_role?: string | null
        }
        Update: {
          attachment?: Json | null
          created_at?: string
          hidden_at?: string | null
          hidden_by?: string | null
          hidden_reason?: string | null
          id?: string
          is_hidden?: boolean
          message?: string
          reply_to?: string | null
          room_id?: string
          sender_email?: string
          sender_id?: string
          sender_name?: string | null
          sender_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          room_id: string
          user_email: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          room_id: string
          user_email?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          room_id?: string
          user_email?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          allowed_roles: Database["public"]["Enums"]["app_role"][]
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          scope: string
          sort_order: number
        }
        Insert: {
          allowed_roles?: Database["public"]["Enums"]["app_role"][]
          created_at?: string
          description?: string | null
          id: string
          is_active?: boolean
          name: string
          scope?: string
          sort_order?: number
        }
        Update: {
          allowed_roles?: Database["public"]["Enums"]["app_role"][]
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          scope?: string
          sort_order?: number
        }
        Relationships: []
      }
      deductions: {
        Row: {
          amount: number
          applicable_date: string
          created_at: string
          created_by: string | null
          created_by_email: string | null
          id: string
          notified: boolean
          reason: string
          updated_at: string
          user_email: string
          user_id: string
          week_start: string
        }
        Insert: {
          amount: number
          applicable_date: string
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          id?: string
          notified?: boolean
          reason: string
          updated_at?: string
          user_email: string
          user_id: string
          week_start: string
        }
        Update: {
          amount?: number
          applicable_date?: string
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          id?: string
          notified?: boolean
          reason?: string
          updated_at?: string
          user_email?: string
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      forms: {
        Row: {
          allow_attachments: boolean
          created_at: string
          created_by: string | null
          created_by_email: string | null
          description: string | null
          fields: Json
          id: string
          kind: Database["public"]["Enums"]["form_kind"]
          status: Database["public"]["Enums"]["form_status"]
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          allow_attachments?: boolean
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          description?: string | null
          fields?: Json
          id?: string
          kind?: Database["public"]["Enums"]["form_kind"]
          status?: Database["public"]["Enums"]["form_status"]
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          allow_attachments?: boolean
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          description?: string | null
          fields?: Json
          id?: string
          kind?: Database["public"]["Enums"]["form_kind"]
          status?: Database["public"]["Enums"]["form_status"]
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      invite_links: {
        Row: {
          code_hash: string
          created_at: string
          created_by: string | null
          created_by_email: string | null
          expires_at: string | null
          id: string
          label: string | null
          max_uses: number | null
          revoked: boolean
          updated_at: string
          used_count: number
        }
        Insert: {
          code_hash: string
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          expires_at?: string | null
          id?: string
          label?: string | null
          max_uses?: number | null
          revoked?: boolean
          updated_at?: string
          used_count?: number
        }
        Update: {
          code_hash?: string
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          expires_at?: string | null
          id?: string
          label?: string | null
          max_uses?: number | null
          revoked?: boolean
          updated_at?: string
          used_count?: number
        }
        Relationships: []
      }
      invite_redemptions: {
        Row: {
          created_at: string
          id: string
          invite_id: string
          user_email: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invite_id: string
          user_email?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invite_id?: string
          user_email?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invite_redemptions_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "invite_links"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_reports: {
        Row: {
          created_at: string
          id: string
          message_id: string
          reason: string
          reported_by: string | null
          reported_by_email: string | null
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          resolved_by_email: string | null
          room_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          reason: string
          reported_by?: string | null
          reported_by_email?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_by_email?: string | null
          room_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          reason?: string
          reported_by?: string | null
          reported_by_email?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_by_email?: string | null
          room_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderation_reports_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_acknowledgements: {
        Row: {
          acknowledged_at: string
          id: string
          notification_id: string
          user_email: string | null
          user_id: string
        }
        Insert: {
          acknowledged_at?: string
          id?: string
          notification_id: string
          user_email?: string | null
          user_id: string
        }
        Update: {
          acknowledged_at?: string
          id?: string
          notification_id?: string
          user_email?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_acknowledgements_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          audience_user_id: string | null
          created_at: string
          created_by: string | null
          created_by_email: string | null
          expires_at: string | null
          id: string
          media: Json
          message: string
          publish_at: string
          repeat_schedule: string
          requires_ack: boolean
          status: Database["public"]["Enums"]["notification_status"]
          title: string
          updated_at: string
        }
        Insert: {
          audience_user_id?: string | null
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          expires_at?: string | null
          id?: string
          media?: Json
          message: string
          publish_at?: string
          repeat_schedule?: string
          requires_ack?: boolean
          status?: Database["public"]["Enums"]["notification_status"]
          title: string
          updated_at?: string
        }
        Update: {
          audience_user_id?: string | null
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          expires_at?: string | null
          id?: string
          media?: Json
          message?: string
          publish_at?: string
          repeat_schedule?: string
          requires_ack?: boolean
          status?: Database["public"]["Enums"]["notification_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      preauthorized_emails: {
        Row: {
          added_by: string | null
          added_by_email: string | null
          claimed_at: string | null
          claimed_by: string | null
          created_at: string
          email: string
          id: string
          note: string | null
        }
        Insert: {
          added_by?: string | null
          added_by_email?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          email: string
          id?: string
          note?: string | null
        }
        Update: {
          added_by?: string | null
          added_by_email?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          email?: string
          id?: string
          note?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_authorized: boolean
          last_seen_at: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_authorized?: boolean
          last_seen_at?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_authorized?: boolean
          last_seen_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      salary_weeks: {
        Row: {
          activity_bonus: number
          chatter_bonus: number
          created_at: string
          created_by: string | null
          created_by_email: string | null
          day_1: number
          day_2: number
          day_3: number
          day_4: number
          day_5: number
          day_6: number
          day_7: number
          deduction: number
          deductions_back: number
          gross_total: number
          hiring_leader_bonus: number
          id: string
          last_week_salary: number
          net_total: number
          night_shift_allowance: number
          service_fee: number
          updated_at: string
          user_email: string
          user_id: string
          week_start: string
        }
        Insert: {
          activity_bonus?: number
          chatter_bonus?: number
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          day_1?: number
          day_2?: number
          day_3?: number
          day_4?: number
          day_5?: number
          day_6?: number
          day_7?: number
          deduction?: number
          deductions_back?: number
          gross_total?: number
          hiring_leader_bonus?: number
          id?: string
          last_week_salary?: number
          net_total?: number
          night_shift_allowance?: number
          service_fee?: number
          updated_at?: string
          user_email: string
          user_id: string
          week_start: string
        }
        Update: {
          activity_bonus?: number
          chatter_bonus?: number
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          day_1?: number
          day_2?: number
          day_3?: number
          day_4?: number
          day_5?: number
          day_6?: number
          day_7?: number
          deduction?: number
          deductions_back?: number
          gross_total?: number
          hiring_leader_bonus?: number
          id?: string
          last_week_salary?: number
          net_total?: number
          night_shift_allowance?: number
          service_fee?: number
          updated_at?: string
          user_email?: string
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      site_banners: {
        Row: {
          created_at: string
          created_by: string | null
          created_by_email: string | null
          ends_at: string | null
          id: string
          is_active: boolean
          link_label: string | null
          link_url: string | null
          message: string
          sort_order: number
          starts_at: string
          updated_at: string
          variant: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          link_label?: string | null
          link_url?: string | null
          message: string
          sort_order?: number
          starts_at?: string
          updated_at?: string
          variant?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          link_label?: string | null
          link_url?: string | null
          message?: string
          sort_order?: number
          starts_at?: string
          updated_at?: string
          variant?: string
        }
        Relationships: []
      }
      site_content: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          updated_by: string | null
          updated_by_email: string | null
          value: Json
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          updated_by_email?: string | null
          value?: Json
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          updated_by_email?: string | null
          value?: Json
        }
        Relationships: []
      }
      submission_status_history: {
        Row: {
          changed_by: string | null
          changed_by_email: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["submission_status"] | null
          id: string
          note: string | null
          submission_id: string
          to_status: Database["public"]["Enums"]["submission_status"]
        }
        Insert: {
          changed_by?: string | null
          changed_by_email?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["submission_status"] | null
          id?: string
          note?: string | null
          submission_id: string
          to_status: Database["public"]["Enums"]["submission_status"]
        }
        Update: {
          changed_by?: string | null
          changed_by_email?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["submission_status"] | null
          id?: string
          note?: string | null
          submission_id?: string
          to_status?: Database["public"]["Enums"]["submission_status"]
        }
        Relationships: [
          {
            foreignKeyName: "submission_status_history_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          answers: Json
          attachments: Json
          created_at: string
          form_id: string | null
          form_snapshot: Json
          form_title: string
          form_version: number
          id: string
          kind: Database["public"]["Enums"]["form_kind"]
          reference: string
          response_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewed_by_email: string | null
          status: Database["public"]["Enums"]["submission_status"]
          user_email: string
          user_id: string
          user_name: string | null
        }
        Insert: {
          answers?: Json
          attachments?: Json
          created_at?: string
          form_id?: string | null
          form_snapshot?: Json
          form_title: string
          form_version?: number
          id?: string
          kind: Database["public"]["Enums"]["form_kind"]
          reference?: string
          response_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_by_email?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          user_email: string
          user_id: string
          user_name?: string | null
        }
        Update: {
          answers?: Json
          attachments?: Json
          created_at?: string
          form_id?: string | null
          form_snapshot?: Json
          form_title?: string
          form_version?: number
          id?: string
          kind?: Database["public"]["Enums"]["form_kind"]
          reference?: string
          response_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_by_email?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          user_email?: string
          user_id?: string
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_preauthorized_emails: { Args: { _emails: string[] }; Returns: number }
      adjust_deduction: {
        Args: { _amount: number; _date: string; _id: string; _reason: string }
        Returns: undefined
      }
      assign_role: {
        Args: { _email: string; _role: Database["public"]["Enums"]["app_role"] }
        Returns: undefined
      }
      bootstrap_profile: {
        Args: never
        Returns: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_authorized: boolean
          last_seen_at: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      bulk_save_salary_weeks: {
        Args: { _notify?: boolean; _rows: Json; _week_start: string }
        Returns: Json
      }
      can_access_room: { Args: { _room_id: string }; Returns: boolean }
      create_deduction: {
        Args: {
          _amount: number
          _date: string
          _notify: boolean
          _reason: string
          _user_id: string
        }
        Returns: string
      }
      create_invite_link: {
        Args: { _expires_at: string; _label: string; _max_uses: number }
        Returns: string
      }
      delete_audit_log: { Args: { _id: string }; Returns: undefined }
      delete_deduction: { Args: { _id: string }; Returns: undefined }
      delete_invite_link: { Args: { _id: string }; Returns: undefined }
      delete_notification: { Args: { _id: string }; Returns: undefined }
      delete_preauthorized_email: { Args: { _id: string }; Returns: undefined }
      delete_salary_week: { Args: { _id: string }; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hash_invite_code: { Args: { _code: string }; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_developer: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      moderate_message: {
        Args: { _hide: boolean; _message_id: string; _reason?: string }
        Returns: undefined
      }
      my_role: { Args: never; Returns: Database["public"]["Enums"]["app_role"] }
      protected_developer_email: { Args: never; Returns: string }
      redeem_invite_link: { Args: { _code: string }; Returns: string }
      report_message: {
        Args: { _message_id: string; _reason: string }
        Returns: string
      }
      resolve_report: {
        Args: { _id: string; _note?: string; _status: string }
        Returns: undefined
      }
      review_submission: {
        Args: {
          _id: string
          _note?: string
          _status: Database["public"]["Enums"]["submission_status"]
        }
        Returns: undefined
      }
      revoke_invite_link: { Args: { _id: string }; Returns: undefined }
      save_salary_week: {
        Args: {
          _activity: number
          _chatter: number
          _days: number[]
          _deduction: number
          _deductions_back: number
          _hiring: number
          _last_week: number
          _night: number
          _notify?: boolean
          _user_id: string
          _week_start: string
        }
        Returns: string
      }
      set_authorization: {
        Args: { _authorized: boolean; _user_id: string }
        Returns: undefined
      }
      touch_presence: { Args: never; Returns: undefined }
      write_audit: {
        Args: {
          _action: string
          _metadata?: Json
          _target_id: string
          _target_type: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "developer" | "admin" | "moderator" | "user"
      form_kind: "request" | "feedback"
      form_status: "draft" | "published" | "archived"
      notification_status: "draft" | "published" | "archived"
      submission_status:
        | "pending"
        | "approved"
        | "declined"
        | "new"
        | "acknowledged"
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
    Enums: {
      app_role: ["developer", "admin", "moderator", "user"],
      form_kind: ["request", "feedback"],
      form_status: ["draft", "published", "archived"],
      notification_status: ["draft", "published", "archived"],
      submission_status: [
        "pending",
        "approved",
        "declined",
        "new",
        "acknowledged",
      ],
    },
  },
} as const
