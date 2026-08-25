import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";
import Purchases from "react-native-purchases";
import { useUser, useAuth } from "@clerk/expo";

export const REVENUECAT_ENTITLEMENT_IDENTIFIER = "TNP Premium";
const PREMIUM_EMAIL_ALLOWLIST = new Set([
  "e.tshibanda78@gmail.com",
]);

type SubscriptionContextValue = {
  available: boolean;
  isActive: boolean;
  isTrialing: boolean;
  /** RevenueCat product identifier for the active subscription (e.g. "tnp_premium_monthly"). */
  productIdentifier: string | null;
  offerings: any;
  loading: boolean;
  purchase: (pkg: any) => Promise<void>;
  restore: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextValue>({
  available: false,
  isActive: false,
  isTrialing: false,
  productIdentifier: null,
  offerings: null,
  loading: false,
  purchase: async () => undefined,
  restore: async () => undefined,
});

// Expo Go cannot load the native App Store / Google Play billing modules.
// RevenueCat's Preview API mode still supports the Test Store in Expo Go.
const isExpoGo = Constants.appOwnership === "expo";

/**
 * Apple/Google provide the localized storefront price only from a native
 * store-connected build. Expo Go uses RevenueCat's Test Store instead, whose
 * currency is not the user's App Store currency.
 */
export const isNativeStorePricingAvailable = Platform.OS !== "web" && !isExpoGo;

export function getLocalizedPackagePrice(pkg: any): string | null {
  if (!isNativeStorePricingAvailable) return null;
  return typeof pkg?.product?.priceString === "string" ? pkg.product.priceString : null;
}

function getApiKey() {
  // Expo Go and web previews must use the Test Store key. The native iOS key
  // is only valid for an App Store-connected RevenueCat app.
  if (isExpoGo || Platform.OS === "web") {
    return process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY;
  }
  if (Platform.OS === "ios") {
    return process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
      ?? (__DEV__ ? process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY : undefined);
  }
  if (Platform.OS === "android") {
    return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY
      ?? (__DEV__ ? process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY : undefined);
  }
  return process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY;
}

function getPlatform(): string {
  if (Platform.OS === "ios") return "ios";
  if (Platform.OS === "android") return "android";
  return "test";
}

function getApiBase(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}` : "";
}

function hasPremiumEmailAccess(email: string | null | undefined): boolean {
  return Boolean(email && PREMIUM_EMAIL_ALLOWLIST.has(email.trim().toLowerCase()));
}

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [offerings, setOfferings] = useState<any>(null);
  const [customerInfo, setCustomerInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const available = Boolean(getApiKey()) && Platform.OS !== "web";

  /**
   * Trigger a server-side entitlement sync.
   *
   * The server independently calls RevenueCat's REST API using its own SDK keys
   * to verify the subscription. This function sends only the `platform` hint —
   * NO entitlement data from the client is trusted by the server.
   *
   * Failures are non-fatal: the server will deny premium-gated actions until
   * the next successful sync, which is the correct security posture.
   */
  const syncToServer = useCallback(async (): Promise<void> => {
    const base = getApiBase();
    if (!base) return; // dev environment without a domain configured
    try {
      const token = await getToken();
      if (!token) return;
      await fetch(`${base}/api/subscription/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ platform: getPlatform() }),
      });
    } catch {
      // Non-fatal — next purchase/restore attempt will retry
    }
  }, [getToken]);

  useEffect(() => {
    if (!available || Platform.OS === "web") return;
    try {
      Purchases.configure({ apiKey: getApiKey()!, appUserID: user?.id });
    } catch {
      // Native billing is unavailable or misconfigured; keep the app usable.
      return;
    }
    void Promise.all([Purchases.getOfferings(), Purchases.getCustomerInfo()])
      .then(([nextOfferings, nextInfo]) => {
        setOfferings(nextOfferings);
        setCustomerInfo(nextInfo);
        // Always verify with the server, including when there is no active
        // entitlement, so an expired or restored account cannot retain stale
        // Premium access in the shared database.
        void syncToServer();
      })
      .catch(() => undefined);
  }, [available, user?.id, syncToServer]);

  const value = useMemo<SubscriptionContextValue>(() => {
    const entitlement = customerInfo?.entitlements?.active?.[REVENUECAT_ENTITLEMENT_IDENTIFIER];
    return {
      available,
      isActive: Boolean(entitlement) || hasPremiumEmailAccess(user?.primaryEmailAddress?.emailAddress),
      isTrialing: entitlement?.periodType === "TRIAL",
      productIdentifier: entitlement?.productIdentifier ?? null,
      offerings,
      loading,
      purchase: async (pkg) => {
        setLoading(true);
        try {
          const result = await Purchases.purchasePackage(pkg);
          setCustomerInfo(result.customerInfo);
          // Server verifies the purchase independently with RevenueCat REST API
          await syncToServer();
        } finally {
          setLoading(false);
        }
      },
      restore: async () => {
        setLoading(true);
        try {
          const info = await Purchases.restorePurchases();
          setCustomerInfo(info);
          // Server verifies the restored entitlement independently
          await syncToServer();
        } finally {
          setLoading(false);
        }
      },
    };
  }, [available, customerInfo, loading, offerings, syncToServer]);

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
