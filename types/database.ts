export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "admin" | "editor" | "media_manager";

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: UserRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
      };
      artists: {
        Row: {
          id: string;
          name: string;
          slug: string;
          bio: string | null;
          hero_image_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          bio?: string | null;
          hero_image_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          bio?: string | null;
          hero_image_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      albums: {
        Row: {
          id: string;
          artist_id: string;
          title: string;
          slug: string;
          release_date: string | null;
          cover_image_url: string | null;
          description: string | null;
          is_featured: boolean;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          artist_id: string;
          title: string;
          slug: string;
          release_date?: string | null;
          cover_image_url?: string | null;
          description?: string | null;
          is_featured?: boolean;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          artist_id?: string;
          title?: string;
          slug?: string;
          release_date?: string | null;
          cover_image_url?: string | null;
          description?: string | null;
          is_featured?: boolean;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      tracks: {
        Row: {
          id: string;
          album_id: string;
          title: string;
          slug: string;
          duration_seconds: number | null;
          track_number: number | null;
          audio_url: string | null;
          lyrics: string | null;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          album_id: string;
          title: string;
          slug: string;
          duration_seconds?: number | null;
          track_number?: number | null;
          audio_url?: string | null;
          lyrics?: string | null;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          album_id?: string;
          title?: string;
          slug?: string;
          duration_seconds?: number | null;
          track_number?: number | null;
          audio_url?: string | null;
          lyrics?: string | null;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      track_likes: {
        Row: {
          id: string;
          track_id: string;
          device_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          track_id: string;
          device_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          track_id?: string;
          device_id?: string;
          created_at?: string;
        };
      };
      platform_links: {
        Row: {
          id: string;
          album_id: string | null;
          track_id: string | null;
          platform: string;
          url: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          album_id?: string | null;
          track_id?: string | null;
          platform: string;
          url: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          album_id?: string | null;
          track_id?: string | null;
          platform?: string;
          url?: string;
          created_at?: string;
        };
      };
      media_assets: {
        Row: {
          id: string;
          title: string;
          media_type: "image" | "audio" | "video" | "document";
          file_path: string;
          public_url: string | null;
          alt_text: string | null;
          uploaded_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          media_type: "image" | "audio" | "video" | "document";
          file_path: string;
          public_url?: string | null;
          alt_text?: string | null;
          uploaded_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          media_type?: "image" | "audio" | "video" | "document";
          file_path?: string;
          public_url?: string | null;
          alt_text?: string | null;
          uploaded_by?: string;
          created_at?: string;
        };
      };
      merch_products: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description_short: string | null;
          description_long: string | null;
          price: number;
          currency: string;
          compare_at_price: number | null;
          category: string;
          status: "in_stock" | "low_stock" | "out_of_stock" | "preorder" | "new_drop";
          is_featured: boolean;
          is_published: boolean;
          cover_image_url: string | null;
          gallery_urls: string[];
          buy_link: string;
          stock_total: number;
          sku: string | null;
          weight_grams: number | null;
          release_date: string | null;
          variants_json: Json;
          seo_title: string | null;
          seo_description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description_short?: string | null;
          description_long?: string | null;
          price?: number;
          currency?: string;
          compare_at_price?: number | null;
          category?: string;
          status?: "in_stock" | "low_stock" | "out_of_stock" | "preorder" | "new_drop";
          is_featured?: boolean;
          is_published?: boolean;
          cover_image_url?: string | null;
          gallery_urls?: string[];
          buy_link: string;
          stock_total?: number;
          sku?: string | null;
          weight_grams?: number | null;
          release_date?: string | null;
          variants_json?: Json;
          seo_title?: string | null;
          seo_description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description_short?: string | null;
          description_long?: string | null;
          price?: number;
          currency?: string;
          compare_at_price?: number | null;
          category?: string;
          status?: "in_stock" | "low_stock" | "out_of_stock" | "preorder" | "new_drop";
          is_featured?: boolean;
          is_published?: boolean;
          cover_image_url?: string | null;
          gallery_urls?: string[];
          buy_link?: string;
          stock_total?: number;
          sku?: string | null;
          weight_grams?: number | null;
          release_date?: string | null;
          variants_json?: Json;
          seo_title?: string | null;
          seo_description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      site_settings: {
        Row: {
          key: string;
          value: Json;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: Json;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: Json;
          updated_at?: string;
        };
      };
      pages_content: {
        Row: {
          id: string;
          page_key: string;
          section_key: string;
          content: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          page_key: string;
          section_key: string;
          content: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          page_key?: string;
          section_key?: string;
          content?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          actor_email: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          details: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          actor_email?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          details?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_id?: string | null;
          actor_email?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          details?: Json | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: UserRole;
      media_type: "image" | "audio" | "video" | "document";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
