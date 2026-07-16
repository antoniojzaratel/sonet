import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          username: string;
          display_name: string;
          avatar_url: string | null;
          bio: string | null;
          spotify_id: string | null;
          apple_music_id: string | null;
          followers_count: number;
          following_count: number;
          ratings_count: number;
          created_at: string;
        };
      };
      ratings: {
        Row: {
          id: string;
          user_id: string;
          content_type: string;
          content_id: string;
          content_name: string;
          content_image: string | null;
          artist_name: string;
          album_name: string | null;
          score: number;
          review: string | null;
          liked: boolean;
          created_at: string;
        };
      };
      events: {
        Row: {
          id: string;
          creator_id: string;
          title: string;
          description: string | null;
          event_type: string;
          venue: string | null;
          address: string | null;
          latitude: number;
          longitude: number;
          date: string;
          end_date: string | null;
          ticket_url: string | null;
          cover_image: string | null;
          attendees_count: number;
          max_attendees: number | null;
          is_official: boolean;
          artist_names: string[] | null;
          price: number | null;
          created_at: string;
        };
      };
    };
  };
};
