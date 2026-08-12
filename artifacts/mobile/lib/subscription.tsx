import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import Purchases from "react-native-purchases";
import { useUser, useAuth } from "@clerk/expo";

export const REVENUECAT_ENTITLEMENT_IDENTIFIER = "premium";

type SubscriptionContextValue = {
  available: boolean;
  isActive: boolean;
  isTrialing: boolean;
  offerings: any;
  loading: boolean;
  purchase: (pkg: any) => Promise<void>;
  restore: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextValue>({
  available: false,
  isActive: false,
  isTrialing: false,
  offerings: null,
  loading: false,
  purchase: async () => undefined,
  restore: async () => undefined,
});

function getApiKey() {
  if (Platform.OS === "ios") return process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
  if (Platform.OS === "android") return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;
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

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [offerings, setOfferings] = useState<any>(null);
  const [customerInfo, setCustomerInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const available = Boolean(getApiKey());

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
    Purchases.configure({ apiKey: getApiKey()!, appUserID: user?.id });
    void Promise.all([Purchases.getOfferings(), Purchases.getCustomerInfo()])
      .then(([nextOfferings, nextInfo]) => {
        setOfferings(nextOfferings);
        setCustomerInfo(nextInfo);
        // If the SDK already reports an active entitlement (e.g. returning user),
        // sync to the server so the DB reflects the current subscription state.
        const entitlement =
          nextInfo?.entitlements?.active?.[REVENUECAT_ENTITLEMENT_IDENTIFIER];
        if (entitlement) {
          void syncToServer();
        }
      })
      .catch(() => undefined);
  }, [available, user?.id, syncToServer]);

  const value = useMemo<SubscriptionContextValue>(() => {
    const entitlement = customerInfo?.entitlements?.active?.[REVENUECAT_ENTITLEMENT_IDENTIFIER];
    return {
      available,
      isActive: Boolean(entitlement),
      isTrialing: entitlement?.periodType === "TRIAL",
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
