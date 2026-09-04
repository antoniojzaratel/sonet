import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { isBlocked } from '@/lib/blocking';
import { sendPushTo } from '@/lib/push';
import { track } from '@/lib/analytics';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface SharedSong {
  id: string;
  name: string;
  artist: string;
  preview_url?: string | null;
  cover_image?: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  metadata?: { song?: SharedSong } | null;
  created_at: string;
}

export interface ConversationSummary {
  id: string;
  participants: string[];
  updated_at: string;
  otherUser: { id: string; display_name: string; username: string; avatar_url?: string } | null;
  lastMessage: string | null;
}

interface ChatState {
  conversations: ConversationSummary[];
  messages: ChatMessage[];
  loadingConversations: boolean;
  loadingMessages: boolean;

  loadConversations: (userId: string) => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  subscribeToMessages: (conversationId: string) => void;
  unsubscribeFromMessages: () => void;
  sendMessage: (conversationId: string, senderId: string, content: string) => Promise<void>;
  sendSongShare: (conversationId: string, senderId: string, song: SharedSong) => Promise<void>;
  getOrCreateConversation: (userA: string, userB: string) => Promise<string | null>;
}

let messageChannel: RealtimeChannel | null = null;

/** Returns the other participant's id, or `undefined` if either side has blocked the other. */
async function getOtherParticipantIfAllowed(conversationId: string, senderId: string): Promise<string | null | undefined> {
  const { data: conv } = await supabase
    .from('conversations')
    .select('participants')
    .eq('id', conversationId)
    .maybeSingle();
  const otherId = (conv?.participants ?? []).find((p: string) => p !== senderId) ?? null;
  if (otherId && ((await isBlocked(senderId, otherId)) || (await isBlocked(otherId, senderId)))) {
    return undefined;
  }
  return otherId;
}

async function notifyOther(otherId: string | null, senderId: string, previewText: string): Promise<void> {
  if (!otherId) return;
  const { data: sender } = await supabase.from('users').select('display_name').eq('id', senderId).maybeSingle();
  sendPushTo(otherId, sender?.display_name ?? 'Nuevo mensaje', previewText.slice(0, 120));
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  messages: [],
  loadingConversations: false,
  loadingMessages: false,

  loadConversations: async (userId) => {
    set({ loadingConversations: true });
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .contains('participants', [userId])
      .order('updated_at', { ascending: false });

    const rows = (data ?? []) as { id: string; participants: string[]; updated_at: string }[];
    const otherIds = rows
      .map((c) => c.participants.find((p) => p !== userId))
      .filter((id): id is string => !!id);

    const [{ data: users }, { data: lastMsgs }] = await Promise.all([
      otherIds.length
        ? supabase.from('users').select('id, display_name, username, avatar_url').in('id', otherIds)
        : Promise.resolve({ data: [] as any[] }),
      rows.length
        ? supabase
            .from('messages')
            .select('conversation_id, content, created_at')
            .in('conversation_id', rows.map((c) => c.id))
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const usersById = Object.fromEntries((users ?? []).map((u: any) => [u.id, u]));
    const lastByConv: Record<string, string> = {};
    for (const m of (lastMsgs ?? []) as any[]) {
      if (!lastByConv[m.conversation_id]) lastByConv[m.conversation_id] = m.content;
    }

    const conversations: ConversationSummary[] = rows.map((c) => {
      const otherId = c.participants.find((p) => p !== userId);
      return {
        id: c.id,
        participants: c.participants,
        updated_at: c.updated_at,
        otherUser: otherId
          ? usersById[otherId] ?? { id: otherId, display_name: 'Usuario', username: 'usuario' }
          : null,
        lastMessage: lastByConv[c.id] ?? null,
      };
    });

    set({ conversations, loadingConversations: false });
  },

  loadMessages: async (conversationId) => {
    set({ loadingMessages: true });
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    set({ messages: (data as ChatMessage[]) ?? [], loadingMessages: false });
  },

  subscribeToMessages: (conversationId) => {
    get().unsubscribeFromMessages();
    messageChannel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          set((state) => {
            if (state.messages.some((m) => m.id === (payload.new as ChatMessage).id)) return state;
            return { messages: [...state.messages, payload.new as ChatMessage] };
          });
        }
      )
      .subscribe();
  },

  unsubscribeFromMessages: () => {
    if (messageChannel) {
      supabase.removeChannel(messageChannel);
      messageChannel = null;
    }
  },

  sendMessage: async (conversationId, senderId, content) => {
    if (!content.trim()) return;
    const otherId = await getOtherParticipantIfAllowed(conversationId, senderId);
    if (otherId === undefined) return; // blocked either direction

    const { error } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: senderId, content: content.trim() });

    if (!error) {
      track('chat_message_sent');
      await notifyOther(otherId, senderId, content.trim());
    }
  },

  sendSongShare: async (conversationId, senderId, song) => {
    const otherId = await getOtherParticipantIfAllowed(conversationId, senderId);
    if (otherId === undefined) return; // blocked either direction

    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content: `${song.name} — ${song.artist}`,
      message_type: 'song_share',
      metadata: { song },
    });

    if (!error) {
      track('chat_message_sent', { message_type: 'song_share' });
      await notifyOther(otherId, senderId, `Te compartió "${song.name}"`);
    }
  },

  getOrCreateConversation: async (userA, userB) => {
    // Don't start a new thread if either side has blocked the other. An
    // already-existing conversation is left alone (see sendMessage) rather
    // than hidden, so history doesn't just vanish.
    if ((await isBlocked(userA, userB)) || (await isBlocked(userB, userA))) return null;

    const { data: existing } = await supabase
      .from('conversations')
      .select('id, participants')
      .contains('participants', [userA, userB]);

    const exact = ((existing ?? []) as { id: string; participants: string[] }[]).find((c) => c.participants.length === 2);
    if (exact) return exact.id;

    const { data: created, error } = await supabase
      .from('conversations')
      .insert({ participants: [userA, userB] })
      .select('id')
      .single();
    if (error || !created) return null;
    return created.id as string;
  },
}));
