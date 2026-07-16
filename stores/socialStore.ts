import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Match, Conversation, Message, Event, User } from '@/types';

interface SocialState {
  matches: Match[];
  conversations: Conversation[];
  events: Event[];
  loadingMatches: boolean;
  loadingConversations: boolean;
  loadingEvents: boolean;

  fetchMatches: (userId: string) => Promise<void>;
  fetchConversations: (userId: string) => Promise<void>;
  fetchEvents: () => Promise<void>;
  createEvent: (event: Omit<Event, 'id' | 'created_at' | 'attendees_count'>) => Promise<Event | null>;
  attendEvent: (eventId: string, userId: string) => Promise<void>;
  sendMessage: (conversationId: string, senderId: string, content: string) => Promise<void>;
  startConversation: (userId: string, otherUserId: string) => Promise<string | null>;
  followUser: (userId: string, targetId: string) => Promise<void>;
  unfollowUser: (userId: string, targetId: string) => Promise<void>;
}

export const useSocialStore = create<SocialState>((set, get) => ({
  matches: [],
  conversations: [],
  events: [],
  loadingMatches: false,
  loadingConversations: false,
  loadingEvents: false,

  fetchMatches: async (userId: string) => {
    set({ loadingMatches: true });
    const { data: myRatings } = await supabase
      .from('ratings')
      .select('artist_name, content_type')
      .eq('user_id', userId)
      .gte('score', 7);

    if (!myRatings?.length) {
      set({ loadingMatches: false });
      return;
    }

    const artistNames = [...new Set(myRatings.map((r) => r.artist_name))].slice(0, 10);

    const { data: similarUsers } = await supabase
      .from('ratings')
      .select(`user_id, users(id, username, display_name, avatar_url, bio)`)
      .in('artist_name', artistNames)
      .neq('user_id', userId)
      .gte('score', 7)
      .limit(50);

    if (!similarUsers) {
      set({ loadingMatches: false });
      return;
    }

    const userScores: Record<string, { user: any; count: number }> = {};
    similarUsers.forEach((r: any) => {
      if (!r.users) return;
      const uid = r.user_id;
      if (!userScores[uid]) userScores[uid] = { user: r.users, count: 0 };
      userScores[uid].count++;
    });

    const matches: Match[] = Object.values(userScores)
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
      .map(({ user, count }) => ({
        user,
        taste_score: Math.min(99, Math.round((count / artistNames.length) * 100)),
        shared_genres: [],
        shared_artists: artistNames.slice(0, count),
        common_events: 0,
      }));

    set({ matches, loadingMatches: false });
  },

  fetchConversations: async (userId: string) => {
    set({ loadingConversations: true });
    const { data } = await supabase
      .from('conversations')
      .select(`*, messages(id, content, created_at, sender_id) `)
      .contains('participants', [userId])
      .order('updated_at', { ascending: false });

    if (data) {
      set({ conversations: data as Conversation[] });
    }
    set({ loadingConversations: false });
  },

  fetchEvents: async () => {
    set({ loadingEvents: true });
    const { data } = await supabase
      .from('events')
      .select(`*, creator:users(id, username, display_name, avatar_url)`)
      .gte('date', new Date().toISOString())
      .order('date', { ascending: true })
      .limit(100);

    if (data) {
      set({ events: data as Event[] });
    }
    set({ loadingEvents: false });
  },

  createEvent: async (event) => {
    const { data, error } = await supabase
      .from('events')
      .insert({ ...event, attendees_count: 1 })
      .select()
      .single();

    if (!error && data) {
      set((state) => ({ events: [data as Event, ...state.events] }));
      return data as Event;
    }
    return null;
  },

  attendEvent: async (eventId, userId) => {
    await supabase.from('event_attendees').upsert({ event_id: eventId, user_id: userId });
    await supabase.rpc('increment_event_attendees', { event_id: eventId });
  },

  sendMessage: async (conversationId, senderId, content) => {
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content,
      message_type: 'text',
    });
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);
  },

  startConversation: async (userId, otherUserId) => {
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .contains('participants', [userId, otherUserId])
      .single();

    if (existing) return existing.id;

    const { data, error } = await supabase
      .from('conversations')
      .insert({ participants: [userId, otherUserId] })
      .select()
      .single();

    return data?.id || null;
  },

  followUser: async (userId, targetId) => {
    await supabase.from('follows').insert({ follower_id: userId, following_id: targetId });
  },

  unfollowUser: async (userId, targetId) => {
    await supabase
      .from('follows')
      .delete()
      .eq('follower_id', userId)
      .eq('following_id', targetId);
  },
}));
