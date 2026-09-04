import { supabase } from './supabase';

/** IDs the current user has blocked. Used to filter them out of Discover/SoundMatch/chat. */
export async function fetchBlockedIds(userId: string): Promise<Set<string>> {
  try {
    const { data } = await supabase.from('blocked_users').select('blocked_id').eq('blocker_id', userId);
    return new Set((data ?? []).map((r: any) => r.blocked_id as string));
  } catch {
    return new Set();
  }
}

export async function blockUser(blockerId: string, blockedId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('blocked_users').insert({ blocker_id: blockerId, blocked_id: blockedId });
    return !error;
  } catch {
    return false;
  }
}

export async function unblockUser(blockerId: string, blockedId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('blocked_users')
      .delete()
      .eq('blocker_id', blockerId)
      .eq('blocked_id', blockedId);
    return !error;
  } catch {
    return false;
  }
}

export async function isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('blocked_users')
      .select('blocker_id')
      .eq('blocker_id', blockerId)
      .eq('blocked_id', blockedId)
      .maybeSingle();
    return !!data;
  } catch {
    return false;
  }
}
