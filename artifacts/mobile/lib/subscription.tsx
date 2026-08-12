import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import Purchases from "react-native-purchases";
import { useUser } from "@clerk/expo";

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

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const [offerings, setOfferings] = useState<any>(null);
  const [customerInfo, setCustomerInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const available = Boolean(getApiKey());

  useEffect(() => {
    if (!available || Platform.OS === "web") return;
    Purchases.configure({ apiKey: getApiKey()!, appUserID: user?.id });
    void Promise.all([Purchases.getOfferings(), Purchases.getCustomerInfo()])
      .then(([nextOfferings, nextInfo]) => {
        setOfferings(nextOfferings);
        setCustomerInfo(nextInfo);
      })
      .catch(() => undefined);
  }, [available, user?.id]);

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
        } finally {
          setLoading(false);
        }
      },
      restore: async () => {
        setLoading(true);
        try {
          setCustomerInfo(await Purchases.restorePurchases());
        } finally {
          setLoading(false);
        }
      },
    };
  }, [available, customerInfo, loading, offerings]);

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}