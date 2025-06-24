export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          avatar_url: string | null
          role: 'admin' | 'editor' | 'viewer'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name: string
          avatar_url?: string | null
          role?: 'admin' | 'editor' | 'viewer'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          avatar_url?: string | null
          role?: 'admin' | 'editor' | 'viewer'
          created_at?: string
          updated_at?: string
        }
      }
      campaigns: {
        Row: {
          id: string
          name: string
          description: string | null
          color: string
          status: 'active' | 'inactive' | 'archived'
          start_date: string | null
          end_date: string | null
          created_at: string
          updated_at: string
          created_by: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          color: string
          status?: 'active' | 'inactive' | 'archived'
          start_date?: string | null
          end_date?: string | null
          created_at?: string
          updated_at?: string
          created_by: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          color?: string
          status?: 'active' | 'inactive' | 'archived'
          start_date?: string | null
          end_date?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string
        }
      }
      projects: {
        Row: {
          id: string
          name: string
          description: string | null
          image: string | null
          color: string
          status: 'vem-ai' | 'breve-lancamento' | 'lancamento'
          location: string | null
          created_at: string
          updated_at: string
          created_by: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          image?: string | null
          color: string
          status?: 'vem-ai' | 'breve-lancamento' | 'lancamento'
          location?: string | null
          created_at?: string
          updated_at?: string
          created_by: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          image?: string | null
          color?: string
          status?: 'vem-ai' | 'breve-lancamento' | 'lancamento'
          location?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string
        }
      }
      assets: {
        Row: {
          id: string
          name: string
          description: string | null
          type: 'image' | 'video' | 'document' | 'archive'
          format: string
          size: number
          url: string
          thumbnail_url: string | null
          tags: string[]
          category_type: 'campaign' | 'project'
          category_id: string
          category_name: string | null
          project_phase: 'vem-ai' | 'breve-lancamento' | 'lancamento' | null
          is_public: boolean
          download_count: number
          metadata: Json | null
          created_at: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          type: 'image' | 'video' | 'document' | 'archive'
          format: string
          size: number
          url: string
          thumbnail_url?: string | null
          tags?: string[]
          category_type: 'campaign' | 'project'
          category_id: string
          category_name?: string | null
          project_phase?: 'vem-ai' | 'breve-lancamento' | 'lancamento' | null
          is_public?: boolean
          download_count?: number
          metadata?: Json | null
          created_at?: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          type?: 'image' | 'video' | 'document' | 'archive'
          format?: string
          size?: number
          url?: string
          thumbnail_url?: string | null
          tags?: string[]
          category_type?: 'campaign' | 'project'
          category_id?: string
          category_name?: string | null
          project_phase?: 'vem-ai' | 'breve-lancamento' | 'lancamento' | null
          is_public?: boolean
          download_count?: number
          metadata?: Json | null
          created_at?: string
          updated_at?: string
          uploaded_by?: string
        }
      }
      shared_links: {
        Row: {
          id: string
          asset_id: string
          token: string
          expires_at: string | null
          download_count: number
          max_downloads: number | null
          is_active: boolean
          created_at: string
          created_by: string
        }
        Insert: {
          id?: string
          asset_id: string
          token: string
          expires_at?: string | null
          download_count?: number
          max_downloads?: number | null
          is_active?: boolean
          created_at?: string
          created_by: string
        }
        Update: {
          id?: string
          asset_id?: string
          token?: string
          expires_at?: string | null
          download_count?: number
          max_downloads?: number | null
          is_active?: boolean
          created_at?: string
          created_by?: string
        }
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