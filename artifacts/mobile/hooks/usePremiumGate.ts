import { useState, useCallback } from 'react';
import { useSubscription } from '@/lib/subscription';

/**
 * usePremiumGate — gating helper for premium-only features.
 *
 * Usage:
 *   const { paywallVisible, closePaywall, requirePremium } = usePremiumGate();
 *
 *   // In a button handler:
 *   requirePremium(() => { /* do the premium action *\/ });
 *
 *   // In JSX:
 *   <PaywallModal visible={paywallVisible} onClose={closePaywall} featureLabel="Contrats" />
 */
export function usePremiumGate() {
  const { isActive } = useSubscription();
  const [paywallVisible, setPaywallVisible] = useState(false);

  const openPaywall = useCallback(() => setPaywallVisible(true), []);
  const closePaywall = useCallback(() => setPaywallVisible(false), []);

  /**
   * If the user has an active premium subscription, call `action` immediately.
   * Otherwise, open the paywall modal.
   */
  const requirePremium = useCallback(
    (action: () => void) => {
      if (isActive) {
        action();
      } else {
        setPaywallVisible(true);
      }
    },
    [isActive],
  );

  return { paywallVisible, openPaywall, closePaywall, requirePremium, isPremium: isActive };
}
