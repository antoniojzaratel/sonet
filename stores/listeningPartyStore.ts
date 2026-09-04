import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { track } from '@/lib/analytics';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface PartyTrack {
  track_id: string;
  name: string;
  artist: string;
  cover_image?: string;
  preview_url: string | null;
  added_by?: string;
}

export interface PartyState {
  event_id: string;
  track_id: string | null;
  track_name: string | null;
  artist_name: string | null;
  cover_image: string | null;
  preview_url: string | null;
  is_playing: boolean;
  started_at: string | null;
  queue: PartyTrack[];
}

export interface PartyAttendee {
  user_id: string;
  display_name: string;
}

interface ListeningPartyState {
  state: PartyState | null;
  attendees: PartyAttendee[];
  loading: boolean;

  loadParty: (eventId: string) => Promise<void>;
  subscribe: (eventId: string) => void;
  unsubscribe: () => void;
  playNow: (eventId: string, t: PartyTrack) => Promise<void>;
  addToQueue: (eventId: string, t: PartyTrack) => Promise<void>;
  playNext: (eventId: string) => Promise<void>;
}

let channel: RealtimeChannel | null = null;

function rowToState(row: any): PartyState {
  return {
    event_id: row.event_id,
    track_id: row.track_id,
    track_name: row.track_name,
    artist_name: row.artist_name,
    cover_image: row.cover_image,
    preview_url: row.preview_url,
    is_playing: row.is_playing,
    started_at: row.started_at,
    queue: row.queue ?? [],
  };
}

/** Ensures a listening_party_state row exists for this event (first attendee to open the room creates it). */
async function ensureState(eventId: string): Promise<PartyState | null> {
  await supabase
    .from('listening_party_state')
    .upsert({ event_id: eventId }, { onConflict: 'event_id', ignoreDuplicates: true });

  const { data } = await supabase.from('listening_party_state').select('*').eq('event_id', eventId).maybeSingle();
  return data ? rowToState(data) : null;
}

async function fetchAttendees(eventId: string): Promise<PartyAttendee[]> {
  const { data } = await supabase
    .from('event_attendees')
    .select('user_id, user:users(display_name)')
    .eq('event_id', eventId);
  return ((data ?? []) as any[]).map((r) => ({ user_id: r.user_id, display_name: r.user?.display_name ?? 'Alguien' }));
}

export const useListeningPartyStore = create<ListeningPartyState>((set, get) => ({
  state: null,
  attendees: [],
  loading: false,

  loadParty: async (eventId) => {
    set({ loading: true });
    const [state, attendees] = await Promise.all([ensureState(eventId), fetchAttendees(eventId)]);
    set({ state, attendees, loading: false });
  },

  subscribe: (eventId) => {
    get().unsubscribe();
    channel = supabase
      .channel(`party-${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'listening_party_state', filter: `event_id=eq.${eventId}` },
        (payload) => {
          if (payload.new) set({ state: rowToState(payload.new) });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'event_attendees', filter: `event_id=eq.${eventId}` },
        async () => set({ attendees: await fetchAttendees(eventId) })
      )
      .subscribe();
  },

  unsubscribe: () => {
    if (channel) {
      supabase.removeChannel(channel);
      channel = null;
    }
  },

  playNow: async (eventId, t) => {
    await supabase
      .from('listening_party_state')
      .update({
        track_id: t.track_id,
        track_name: t.name,
        artist_name: t.artist,
        cover_image: t.cover_image ?? null,
        preview_url: t.preview_url,
        is_playing: true,
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('event_id', eventId);
    track('listening_party_track_played');
  },

  addToQueue: async (eventId, t) => {
    // Best-effort read-modify-write — a friend group adding songs within the
    // same second is a low-probability race and worst case is a dropped
    // queue entry, not a broken party, so this doesn't need an RPC like
    // Hitster's steal-token append does.
    const current = get().state;
    const queue = [...(current?.queue ?? []), t];
    await supabase.from('listening_party_state').update({ queue, updated_at: new Date().toISOString() }).eq('event_id', eventId);
  },

  playNext: async (eventId) => {
    const current = get().state;
    if (!current) return;
    const [next, ...rest] = current.queue;
    if (!next) {
      await supabase
        .from('listening_party_state')
        .update({ is_playing: false, track_id: null, track_name: null, artist_name: null, cover_image: null, preview_url: null, started_at: null, updated_at: new Date().toISOString() })
        .eq('event_id', eventId);
      return;
    }
    await supabase
      .from('listening_party_state')
      .update({
        track_id: next.track_id,
        track_name: next.name,
        artist_name: next.artist,
        cover_image: next.cover_image ?? null,
        preview_url: next.preview_url,
        is_playing: true,
        started_at: new Date().toISOString(),
        queue: rest,
        updated_at: new Date().toISOString(),
      })
      .eq('event_id', eventId);
  },
}));
