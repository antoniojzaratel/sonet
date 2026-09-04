// Product analytics via PostHog. Same graceful-degrade convention as
// lib/purchases.ts: no real EXPO_PUBLIC_POSTHOG_API_KEY configured yet, so
// every call here is a safe no-op until the owner sets one up (see
// README's Manual section).

import PostHog from 'posthog-react-native';

const API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? '';
export const isAnalyticsConfigured = !!API_KEY && !API_KEY.includes('your-');

let client: PostHog | null = null;

export function initAnalytics() {
  if (!isAnalyticsConfigured || client) return;
  try {
    client = new PostHog(API_KEY, { host: 'https://us.i.posthog.com' });
  } catch {
    // SDK not linked natively yet (e.g. Expo Go) — rest of the app shouldn't care.
  }
}

export function identify(userId: string) {
  try {
    client?.identify(userId);
  } catch {
    // best-effort
  }
}

/**
 * The handful of events that actually tell you whether the product is
 * working — not an exhaustive tap-tracking log. Add to this list
 * deliberately, not by instrumenting every button.
 */
export type AnalyticsEvent =
  | 'rating_created'
  | 'soundmatch_match'
  | 'hitster_game_started'
  | 'daily_drop_voted'
  | 'story_published'
  | 'chat_message_sent'
  | 'premium_paywall_viewed'
  | 'account_deleted'
  | 'listening_party_track_played';

export function track(event: AnalyticsEvent, properties?: Record<string, string | number | boolean | null>) {
  try {
    client?.capture(event, properties ?? undefined);
  } catch {
    // best-effort
  }
}

export function resetAnalytics() {
  try {
    client?.reset();
  } catch {
    // best-effort
  }
}
