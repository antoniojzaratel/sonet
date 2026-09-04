// RevenueCat integration for the Premium paywall (gates event creation).
//
// There's no real RevenueCat project configured yet — EXPO_PUBLIC_REVENUECAT_API_KEY
// is a placeholder until the owner sets one up (see README's Manual section).
// Every function here degrades to "not premium, no offering" instead of throwing
// when that's the case, so the paywall still renders informationally.

import { Platform } from 'react-native';
import Purchases, { type PurchasesPackage } from 'react-native-purchases';

const API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ?? '';
const PREMIUM_ENTITLEMENT = 'premium';

export const isPurchasesConfigured = !!API_KEY && !API_KEY.includes('your-');

let configured = false;

export function configurePurchases(appUserId?: string) {
  if (!isPurchasesConfigured || configured) return;
  try {
    Purchases.configure({ apiKey: API_KEY, appUserID: appUserId });
    configured = true;
  } catch {
    // SDK not linked natively yet (e.g. Expo Go) — paywall still shows, purchases just won't work.
  }
}

export async function isPremium(): Promise<boolean> {
  if (!isPurchasesConfigured) return false;
  try {
    const info = await Purchases.getCustomerInfo();
    return !!info.entitlements.active[PREMIUM_ENTITLEMENT];
  } catch {
    return false;
  }
}

export async function getPremiumPackage(): Promise<PurchasesPackage | null> {
  if (!isPurchasesConfigured) return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current?.availablePackages[0] ?? null;
  } catch {
    return null;
  }
}

export async function purchasePremium(pkg: PurchasesPackage): Promise<boolean> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return !!customerInfo.entitlements.active[PREMIUM_ENTITLEMENT];
  } catch {
    return false;
  }
}

/** Apple requires this reachable from any subscription paywall (App Review Guideline 3.1.2). */
export async function restorePurchases(): Promise<boolean> {
  if (!isPurchasesConfigured) return false;
  try {
    const customerInfo = await Purchases.restorePurchases();
    return !!customerInfo.entitlements.active[PREMIUM_ENTITLEMENT];
  } catch {
    return false;
  }
}

export const PREMIUM_PRICE_LABEL = Platform.select({ default: '$99 MXN/mes' });
