export interface User {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  spotify_id?: string;
  apple_music_id?: string;
  followers_count: number;
  following_count: number;
  ratings_count: number;
  created_at: string;
  music_profile?: MusicProfile;
}

export interface MusicProfile {
  top_genres: GenreData[];
  top_artists: TopArtist[];
  avg_bpm: number;
  energy_level: number;
  danceability: number;
  valence: number;
  listening_hours_week: number;
  total_ratings: number;
}

export interface GenreData {
  genre: string;
  percentage: number;
  color: string;
}

export interface TopArtist {
  id: string;
  name: string;
  image_url?: string;
  play_count: number;
  genres: string[];
}

export type ContentType = 'song' | 'album' | 'podcast' | 'single' | 'concert' | 'music_video';

export interface Rating {
  id: string;
  user_id: string;
  content_type: ContentType;
  content_id: string;
  content_name: string;
  content_image?: string;
  artist_name: string;
  album_name?: string;
  score: number;
  review?: string;
  liked: boolean;
  created_at: string;
  user?: Partial<User>;
}

export type EventType = 'concert' | 'listening_party' | 'watch_party' | 'festival' | 'meetup';

export interface Event {
  id: string;
  creator_id: string;
  title: string;
  description?: string;
  event_type: EventType;
  venue?: string;
  address?: string;
  latitude: number;
  longitude: number;
  date: string;
  end_date?: string;
  ticket_url?: string;
  cover_image?: string;
  attendees_count: number;
  max_attendees?: number;
  is_official: boolean;
  artist_names?: string[];
  price?: number;
  created_at: string;
  creator?: Partial<User>;
  is_attending?: boolean;
}

export interface Message {
  id: string;
  sender_id: string;
  conversation_id: string;
  content: string;
  message_type: 'text' | 'song_share' | 'event_share' | 'rating_share';
  metadata?: {
    song?: { id: string; name: string; artist: string; preview_url?: string };
    event?: Partial<Event>;
    rating?: Partial<Rating>;
  };
  read_at?: string;
  created_at: string;
  sender?: Partial<User>;
}

export interface Conversation {
  id: string;
  participants: string[];
  last_message?: Message;
  unread_count: number;
  created_at: string;
  other_user?: Partial<User>;
}

export interface Match {
  user: User;
  taste_score: number;
  shared_genres: string[];
  shared_artists: string[];
  common_events: number;
}

export interface GameQuestion {
  id: string;
  type: 'versus' | 'guess_song' | 'roulette';
  option_a?: { id: string; name: string; artist: string; preview_url?: string; image?: string };
  option_b?: { id: string; name: string; artist: string; preview_url?: string; image?: string };
  preview_url?: string;
  answer?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'follow' | 'rating_like' | 'event_invite' | 'match' | 'comment';
  actor_id: string;
  actor?: Partial<User>;
  reference_id?: string;
  content: string;
  read: boolean;
  created_at: string;
}

export interface FeedItem {
  id: string;
  type: 'rating' | 'event' | 'playlist';
  rating?: Rating;
  event?: Event;
  user: Partial<User>;
  created_at: string;
}
