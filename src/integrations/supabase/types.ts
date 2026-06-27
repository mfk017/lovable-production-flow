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
      branches: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoice_counters: {
        Row: {
          last_value: number
          year: number
        }
        Insert: {
          last_value?: number
          year: number
        }
        Update: {
          last_value?: number
          year?: number
        }
        Relationships: []
      }
      order_assignments: {
        Row: {
          assigned_by: string | null
          assigned_to: string | null
          created_at: string
          finished_at: string | null
          id: string
          is_return: boolean
          notes: string | null
          order_id: string
          return_reason: string | null
          stage_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["assignment_status"]
        }
        Insert: {
          assigned_by?: string | null
          assigned_to?: string | null
          created_at?: string
          finished_at?: string | null
          id?: string
          is_return?: boolean
          notes?: string | null
          order_id: string
          return_reason?: string | null
          stage_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["assignment_status"]
        }
        Update: {
          assigned_by?: string | null
          assigned_to?: string | null
          created_at?: string
          finished_at?: string | null
          id?: string
          is_return?: boolean
          notes?: string | null
          order_id?: string
          return_reason?: string | null
          stage_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["assignment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_assignments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_assignments_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "workflow_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      order_history: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          from_stage_id: string | null
          id: string
          notes: string | null
          order_id: string
          to_stage_id: string | null
          to_user_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          from_stage_id?: string | null
          id?: string
          notes?: string | null
          order_id: string
          to_stage_id?: string | null
          to_user_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          from_stage_id?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          to_stage_id?: string | null
          to_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_history_from_stage_id_fkey"
            columns: ["from_stage_id"]
            isOneToOne: false
            referencedRelation: "workflow_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_history_to_stage_id_fkey"
            columns: ["to_stage_id"]
            isOneToOne: false
            referencedRelation: "workflow_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          branch_id: string
          category_id: string
          completed_at: string | null
          created_at: string
          created_by: string
          current_stage_id: string | null
          customer_name: string
          flag_reason: string | null
          flagged: boolean
          id: string
          invoice_number: string
          notes: string | null
          product_name: string
          quantity: number
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
        }
        Insert: {
          branch_id: string
          category_id: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          current_stage_id?: string | null
          customer_name?: string
          flag_reason?: string | null
          flagged?: boolean
          id?: string
          invoice_number: string
          notes?: string | null
          product_name?: string
          quantity?: number
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
        }
        Update: {
          branch_id?: string
          category_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          current_stage_id?: string | null
          customer_name?: string
          flag_reason?: string | null
          flagged?: boolean
          id?: string
          invoice_number?: string
          notes?: string | null
          product_name?: string
          quantity?: number
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_current_stage_id_fkey"
            columns: ["current_stage_id"]
            isOneToOne: false
            referencedRelation: "workflow_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approved: boolean
          created_at: string
          full_name: string
          id: string
          specialty: Database["public"]["Enums"]["worker_specialty"] | null
          updated_at: string
          username: string | null
        }
        Insert: {
          approved?: boolean
          created_at?: string
          full_name?: string
          id: string
          specialty?: Database["public"]["Enums"]["worker_specialty"] | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          approved?: boolean
          created_at?: string
          full_name?: string
          id?: string
          specialty?: Database["public"]["Enums"]["worker_specialty"] | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workflow_stages: {
        Row: {
          category_id: string
          created_at: string
          id: string
          is_final_delivery: boolean
          is_quality: boolean
          label: string
          order_index: number
          required_role: Database["public"]["Enums"]["app_role"]
          required_specialty:
            | Database["public"]["Enums"]["worker_specialty"]
            | null
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          is_final_delivery?: boolean
          is_quality?: boolean
          label: string
          order_index: number
          required_role?: Database["public"]["Enums"]["app_role"]
          required_specialty?:
            | Database["public"]["Enums"]["worker_specialty"]
            | null
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          is_final_delivery?: boolean
          is_quality?: boolean
          label?: string
          order_index?: number
          required_role?: Database["public"]["Enums"]["app_role"]
          required_specialty?:
            | Database["public"]["Enums"]["worker_specialty"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_stages_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_approved: { Args: { _user_id: string }; Returns: boolean }
      next_invoice_number: { Args: never; Returns: string }
    }
    Enums: {
      app_role: "admin" | "reception" | "quality" | "worker"
      assignment_status: "pending" | "in_progress" | "done" | "returned"
      order_status: "in_progress" | "completed" | "flagged"
      worker_specialty:
        | "cutting"
        | "embroidery"
        | "sewing"
        | "buttons"
        | "ironing"
        | "other"
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
      app_role: ["admin", "reception", "quality", "worker"],
      assignment_status: ["pending", "in_progress", "done", "returned"],
      order_status: ["in_progress", "completed", "flagged"],
      worker_specialty: [
        "cutting",
        "embroidery",
        "sewing",
        "buttons",
        "ironing",
        "other",
      ],
    },
  },
} as const
