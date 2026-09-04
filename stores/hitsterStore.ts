import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { buildHitsterDeck, generateRoomCode, type DeckCard } from '@/lib/hitsterDeck';
import { track } from '@/lib/analytics';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface TimelineCard {
  track_id: string;
  name: string;
  artist: string;
  year: number;
  cover_image?: string;
}

export interface HitsterPlayer {
  room_id: string;
  user_id: string;
  timeline: TimelineCard[];
  tokens: number;
  turn_order: number;
  display_name: string;
}

export interface HitsterRound {
  id: string;
  room_id: string;
  round_number: number;
  active_player_id: string;
  track_id: string;
  track_name: string;
  artist_name: string;
  year: number;
  preview_url: string | null;
  cover_image?: string;
  active_placement: number | null;
  steals: { user_id: string; position: number }[];
  status: 'placing' | 'stealing' | 'resolved';
  resolved_winner_id: string | null;
}

export interface HitsterRoom {
  id: string;
  code: string;
  host_id: string;
  status: 'lobby' | 'playing' | 'finished';
  win_target: number;
  deck: DeckCard[];
  deck_position: number;
  current_round_id: string | null;
}

interface HitsterState {
  room: HitsterRoom | null;
  players: HitsterPlayer[];
  round: HitsterRound | null;
  loading: boolean;
  error: string | null;

  createRoom: (hostId: string, spotifyToken?: string | null) => Promise<string | null>;
  joinRoomByCode: (code: string, userId: string) => Promise<string | null>;
  loadRoom: (roomId: string) => Promise<void>;
  subscribe: (roomId: string) => void;
  unsubscribe: () => void;
  startGame: (roomId: string) => Promise<void>;
  submitPlacement: (roundId: string, position: number) => Promise<void>;
  submitSteal: (roundId: string, position: number) => Promise<void>;
  resolveRound: (roundId: string) => Promise<void>;
}

let channel: RealtimeChannel | null = null;

async function fetchPlayers(roomId: string): Promise<HitsterPlayer[]> {
  const { data } = await supabase
    .from('hitster_players')
    .select('*, user:users(display_name)')
    .eq('room_id', roomId)
    .order('turn_order', { ascending: true });

  return ((data ?? []) as any[]).map((row) => ({
    room_id: row.room_id,
    user_id: row.user_id,
    timeline: row.timeline ?? [],
    tokens: row.tokens,
    turn_order: row.turn_order,
    display_name: row.user?.display_name ?? 'Jugador',
  }));
}

async function fetchRoom(roomId: string): Promise<HitsterRoom | null> {
  const { data } = await supabase.from('hitster_rooms').select('*').eq('id', roomId).maybeSingle();
  return data as HitsterRoom | null;
}

async function fetchRound(roundId: string): Promise<HitsterRound | null> {
  const { data } = await supabase.from('hitster_rounds').select('*').eq('id', roundId).maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    room_id: data.room_id,
    round_number: data.round_number,
    active_player_id: data.active_player_id,
    track_id: data.track_id,
    track_name: data.track_name,
    artist_name: data.artist_name,
    year: data.year,
    preview_url: data.preview_url,
    cover_image: data.cover_image,
    active_placement: data.active_placement,
    steals: data.steals ?? [],
    status: data.status,
    resolved_winner_id: data.resolved_winner_id,
  };
}

/** Draws room.deck[room.deck_position] and starts a round for the player at that same index (mod player count). No-op if a round is already in flight or the deck is exhausted. */
async function startRoundIfNeeded(roomId: string) {
  const room = await fetchRoom(roomId);
  if (!room || room.status !== 'playing' || room.current_round_id) return;
  if (room.deck_position >= room.deck.length) {
    await supabase.from('hitster_rooms').update({ status: 'finished' }).eq('id', roomId).eq('status', 'playing');
    return;
  }

  const players = await fetchPlayers(roomId);
  if (players.length === 0) return;

  const card = room.deck[room.deck_position];
  const activePlayer = players[room.deck_position % players.length];

  const { data: newRound, error } = await supabase
    .from('hitster_rounds')
    .insert({
      room_id: roomId,
      round_number: room.deck_position + 1,
      active_player_id: activePlayer.user_id,
      track_id: card.track_id,
      track_name: card.name,
      artist_name: card.artist,
      year: card.year,
      preview_url: card.preview_url,
      cover_image: card.cover_image,
      status: 'placing',
    })
    .select('id')
    .single();

  if (error || !newRound) return;

  // Guard with .eq('current_round_id', null) so a racing duplicate call is a no-op.
  await supabase
    .from('hitster_rooms')
    .update({ current_round_id: newRound.id })
    .eq('id', roomId)
    .is('current_round_id', null);
}

export const useHitsterStore = create<HitsterState>((set, get) => ({
  room: null,
  players: [],
  round: null,
  loading: false,
  error: null,

  createRoom: async (hostId, spotifyToken) => {
    set({ loading: true, error: null });
    const deck = await buildHitsterDeck(spotifyToken);

    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateRoomCode();
      const { data, error } = await supabase
        .from('hitster_rooms')
        .insert({ code, host_id: hostId, deck })
        .select('id')
        .single();

      if (!error && data) {
        await supabase.rpc('hitster_join_room', { p_code: code });
        set({ loading: false });
        return data.id as string;
      }
      // Unique violation on `code` — retry with a new one; anything else, bail.
      if (error && error.code !== '23505') break;
    }

    set({ loading: false, error: 'No se pudo crear la sala' });
    return null;
  },

  joinRoomByCode: async (code, _userId) => {
    set({ loading: true, error: null });
    const { data, error } = await supabase.rpc('hitster_join_room', { p_code: code.toUpperCase().trim() });
    if (error || !data) {
      set({ loading: false, error: 'Código inválido o la sala ya empezó' });
      return null;
    }
    set({ loading: false });
    return (data as { room_id: string }).room_id;
  },

  loadRoom: async (roomId) => {
    const [room, players] = await Promise.all([fetchRoom(roomId), fetchPlayers(roomId)]);
    const round = room?.current_round_id ? await fetchRound(room.current_round_id) : null;
    set({ room, players, round });
  },

  subscribe: (roomId) => {
    get().unsubscribe();
    channel = supabase
      .channel(`hitster-room-${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hitster_rooms', filter: `id=eq.${roomId}` }, async () => {
        const room = await fetchRoom(roomId);
        set({ room });
        if (room?.current_round_id && room.current_round_id !== get().round?.id) {
          set({ round: await fetchRound(room.current_round_id) });
        }
        if (room && !room.current_round_id) set({ round: null });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hitster_players', filter: `room_id=eq.${roomId}` }, async () => {
        set({ players: await fetchPlayers(roomId) });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hitster_rounds', filter: `room_id=eq.${roomId}` }, async (payload) => {
        const id = (payload.new as any)?.id ?? (payload.old as any)?.id;
        if (id) set({ round: await fetchRound(id) });
      })
      .subscribe();

    get().loadRoom(roomId);
  },

  unsubscribe: () => {
    if (channel) {
      supabase.removeChannel(channel);
      channel = null;
    }
  },

  startGame: async (roomId) => {
    const { error } = await supabase
      .from('hitster_rooms')
      .update({ status: 'playing' })
      .eq('id', roomId)
      .eq('status', 'lobby');
    if (!error) {
      track('hitster_game_started');
      await startRoundIfNeeded(roomId);
    }
  },

  submitPlacement: async (roundId, position) => {
    await supabase
      .from('hitster_rounds')
      .update({ active_placement: position, status: 'stealing' })
      .eq('id', roundId)
      .eq('status', 'placing');
  },

  submitSteal: async (roundId, position) => {
    await supabase.rpc('hitster_submit_steal', { p_round_id: roundId, p_position: position });
  },

  resolveRound: async (roundId) => {
    // Guarded update below makes this safe even if several clients' timers fire together.
    const round = await fetchRound(roundId);
    if (!round || round.status !== 'stealing' || round.active_placement === null) return;

    const players = await fetchPlayers(round.room_id);
    const byId = new Map(players.map((p) => [p.user_id, p]));
    const card: TimelineCard = {
      track_id: round.track_id,
      name: round.track_name,
      artist: round.artist_name,
      year: round.year,
      cover_image: round.cover_image,
    };

    const fits = (timeline: TimelineCard[], position: number, year: number) => {
      const prev = position > 0 ? timeline[position - 1]?.year ?? -Infinity : -Infinity;
      const next = position < timeline.length ? timeline[position]?.year ?? Infinity : Infinity;
      return prev <= year && year <= next;
    };

    let winnerId: string | null = null;
    const activePlayer = byId.get(round.active_player_id);

    if (activePlayer && fits(activePlayer.timeline, round.active_placement, round.year)) {
      winnerId = round.active_player_id;
    } else {
      const stealsByTurnOrder = [...round.steals].sort((a, b) => {
        const oa = byId.get(a.user_id)?.turn_order ?? 999;
        const ob = byId.get(b.user_id)?.turn_order ?? 999;
        return oa - ob;
      });
      for (const steal of stealsByTurnOrder) {
        const stealer = byId.get(steal.user_id);
        if (stealer && fits(stealer.timeline, steal.position, round.year)) {
          winnerId = steal.user_id;
          round.active_placement = steal.position; // reuse below for the winner's insert index
          break;
        }
      }
    }

    const { data: resolvedRows, error: resolveError } = await supabase
      .from('hitster_rounds')
      .update({ status: 'resolved', resolved_winner_id: winnerId, resolved_at: new Date().toISOString() })
      .eq('id', roundId)
      .eq('status', 'stealing')
      .select('id');
    // Nothing matched — another client already resolved this round; don't double-advance.
    if (resolveError || !resolvedRows || resolvedRows.length === 0) return;

    // Give everyone a moment to see the reveal (year + winner) before the
    // next round's realtime update replaces this one on screen.
    await new Promise((r) => setTimeout(r, 4000));

    if (winnerId) {
      const winner = byId.get(winnerId)!;
      const newTimeline = [
        ...winner.timeline.slice(0, round.active_placement!),
        card,
        ...winner.timeline.slice(round.active_placement!),
      ];
      await supabase.from('hitster_players').update({ timeline: newTimeline }).eq('room_id', round.room_id).eq('user_id', winnerId);

      if (newTimeline.length >= (await fetchRoom(round.room_id))!.win_target) {
        await supabase.from('hitster_rooms').update({ status: 'finished' }).eq('id', round.room_id).eq('status', 'playing');
        return;
      }
    }

    await supabase
      .from('hitster_rooms')
      .update({ deck_position: (await fetchRoom(round.room_id))!.deck_position + 1, current_round_id: null })
      .eq('id', round.room_id);

    await startRoundIfNeeded(round.room_id);
  },
}));
