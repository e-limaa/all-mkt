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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      assets: {
        Row: {
          category_id: string
          category_name: string | null
          category_type: Database["public"]["Enums"]["category_type"]
          share_path: string | null
          created_at: string | null
          description: string | null
          download_count: number | null
          format: string
          id: string
          is_public: boolean | null
          metadata: Json | null
          name: string
          origin: string
          project_phase: Database["public"]["Enums"]["project_status"] | null
          regional: string
          size: number
          tags: string[] | null
          thumbnail_url: string | null
          type: Database["public"]["Enums"]["asset_type"]
          updated_at: string | null
          uploaded_by: string
          url: string
        }
        Insert: {
          category_id: string
          category_name?: string | null
          category_type: Database["public"]["Enums"]["category_type"]
          share_path?: string | null
          created_at?: string | null
          description?: string | null
          download_count?: number | null
          format: string
          id?: string
          is_public?: boolean | null
          metadata?: Json | null
          name: string
          origin: string
          project_phase?: Database["public"]["Enums"]["project_status"] | null
          regional: string
          size: number
          tags?: string[] | null
          thumbnail_url?: string | null
          type: Database["public"]["Enums"]["asset_type"]
          updated_at?: string | null
          uploaded_by: string
          url: string
        }
        Update: {
          category_id?: string
          category_name?: string | null
          category_type?: Database["public"]["Enums"]["category_type"]
          share_path?: string | null
          created_at?: string | null
          description?: string | null
          download_count?: number | null
          format?: string
          id?: string
          is_public?: boolean | null
          metadata?: Json | null
          name?: string
          origin?: string
          project_phase?: Database["public"]["Enums"]["project_status"] | null
          regional?: string
          size?: number
          tags?: string[] | null
          thumbnail_url?: string | null
          type?: Database["public"]["Enums"]["asset_type"]
          updated_at?: string | null
          uploaded_by?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          color: string
          created_at: string | null
          created_by: string
          description: string | null
          end_date: string | null
          id: string
          name: string
          regional: string
          start_date: string | null
          status: Database["public"]["Enums"]["campaign_status"] | null
          updated_at: string | null
        }
        Insert: {
          color?: string
          created_at?: string | null
          created_by: string
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          regional: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["campaign_status"] | null
          updated_at?: string | null
        }
        Update: {
          color?: string
          created_at?: string | null
          created_by?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          regional?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["campaign_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          color: string
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          image: string | null
          launch_date: string | null
          name: string
          regional: string
          status: Database["public"]["Enums"]["project_status"] | null
          updated_at: string | null
        }
        Insert: {
          color?: string
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          image?: string | null
          launch_date?: string | null
          name: string
          regional: string
          status?: Database["public"]["Enums"]["project_status"] | null
          updated_at?: string | null
        }
        Update: {
          color?: string
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          image?: string | null
          launch_date?: string | null
          name?: string
          regional?: string
          status?: Database["public"]["Enums"]["project_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_links: {
        Row: {
          asset_id: string
          created_at: string | null
          created_by: string
          download_count: number | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_downloads: number | null
          token: string
        }
        Insert: {
          asset_id: string
          created_at?: string | null
          created_by: string
          download_count?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_downloads?: number | null
          token: string
        }
        Update: {
          asset_id?: string
          created_at?: string | null
          created_by?: string
          download_count?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_downloads?: number | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_links_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          admin_email: string | null
          auto_backup: boolean
          compact_sidebar: boolean
          company_name: string | null
          created_at: string
          dark_mode: boolean
          email_notifications: boolean
          id: string
          multi_sessions: boolean
          storage_limit_gb: number
          system_notifications: boolean
          two_factor: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          admin_email?: string | null
          auto_backup?: boolean
          compact_sidebar?: boolean
          company_name?: string | null
          created_at?: string
          dark_mode?: boolean
          email_notifications?: boolean
          id?: string
          multi_sessions?: boolean
          storage_limit_gb?: number
          system_notifications?: boolean
          two_factor?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          admin_email?: string | null
          auto_backup?: boolean
          compact_sidebar?: boolean
          company_name?: string | null
          created_at?: string
          dark_mode?: boolean
          email_notifications?: boolean
          id?: string
          multi_sessions?: boolean
          storage_limit_gb?: number
          system_notifications?: boolean
          two_factor?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          created_by: string | null
          email: string
          id: string
          name: string
          regional: string | null
          material_origin_scope: "house" | "ev" | null
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string | null
          viewer_access_to_all: boolean
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          created_by?: string | null
          email: string
          id: string
          name: string
          regional?: string | null
          material_origin_scope?: "house" | "ev" | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
          viewer_access_to_all?: boolean
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string
          id?: string
          name?: string
          regional?: string | null
          material_origin_scope?: "house" | "ev" | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
          viewer_access_to_all?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "users_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      admin_users: {
        Row: {
          id: string | null
        }
        Insert: {
          id?: string | null
        }
        Update: {
          id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      asset_type: "image" | "video" | "document" | "archive"
      campaign_status: "active" | "inactive" | "archived"
      category_type: "campaign" | "project"
      project_status: "vem-ai" | "breve-lancamento" | "lancamento"
      user_role: "admin" | "editor_marketing" | "viewer" | "editor_trade"
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
      asset_type: ["image", "video", "document", "archive"],
      campaign_status: ["active", "inactive", "archived"],
      category_type: ["campaign", "project"],
      project_status: ["vem-ai", "breve-lancamento", "lancamento"],
      user_role: ["admin", "editor_marketing", "viewer", "editor_trade"],
    },
  },
} as const
