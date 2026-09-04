// Crash reporting via Sentry.
//
// There's no real Sentry project configured yet — EXPO_PUBLIC_SENTRY_DSN is a
// placeholder until the owner creates one (see README's Manual section).
// init() and captureException() both no-op instead of throwing when that's
// the case, same graceful-degrade convention as lib/purchases.ts.

import * as Sentry from '@sentry/react-native';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

export const isSentryConfigured = !!DSN && !DSN.includes('your-');

export function initSentry() {
  if (!isSentryConfigured) return;
  try {
    Sentry.init({
      dsn: DSN,
      tracesSampleRate: 0.2,
      enableAutoSessionTracking: true,
    });
  } catch {
    // SDK not linked natively yet (e.g. Expo Go) — app still runs, just unreported.
  }
}

export function reportError(error: unknown, context?: Record<string, unknown>) {
  if (!isSentryConfigured) return;
  try {
    Sentry.captureException(error, context ? { extra: context } : undefined);
  } catch {
    // never let error reporting itself crash the app
  }
}
