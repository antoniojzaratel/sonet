import { supabase } from './supabase';

/**
 * Checks admin_users for the given user. That table has no client-writable
 * policy at all — the only way in is a row inserted directly via the
 * Supabase SQL Editor, so this can never be spoofed by editing local state.
 */
export async function checkIsAdmin(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.from('admin_users').select('user_id').eq('user_id', userId).maybeSingle();
    return !error && !!data;
  } catch {
    // No reachable backend (demo mode, network hiccup, etc.) — never an admin, never a crash.
    return false;
  }
}
