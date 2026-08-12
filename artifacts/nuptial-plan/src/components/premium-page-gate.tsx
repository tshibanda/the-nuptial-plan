import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Award, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

type SubscriptionStatus = { subscription: { status: string; trialEndsAt: string | null } | null };
type PlansResponse = { data: Array<{ lookupKey: string; plan: 'monthly' | 'annual'; amount: number | null }> };

export function usePremiumStatus() {
  const { data, isLoading } = useQuery({
    queryKey: ['subscription-status'],
    queryFn: async () => {
      const response = await fetch('/api/subscription/status', { credentials: 'include' });
      if (!response.ok) throw new Error('Subscription unavailable');
      return response.json() as Promise<SubscriptionStatus>;
    },
  });
  return { isPremium: Boolean(data?.subscription), loading: isLoading };
}

export function PremiumPageGate({ featureLabel }: { featureLabel: string }) {
  const { data: plans, isLoading } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const response = await fetch('/api/subscription/plans', { credentials: 'include' });
      if (!response.ok) throw new Error('Plans unavailable');
      return response.json() as Promise<PlansResponse>;
    },
  });
  const [busy, setBusy] = useState<string | null>(null);

  const checkout = async (lookupKey: string) => {
    setBusy(lookupKey);
    try {
      const response = await fetch('/api/subscription/checkout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lookupKey }),
      });
      const data = await response.json() as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error ?? 'Checkout indisponible');
      window.location.assign(data.url);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-2xl border border-[#C8A96E]/45 bg-[#F7EEDB]/55 p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="rounded-xl bg-[#5D2D5D] p-3 text-[#E2B93B]"><Lock size={19} /></div>
        <div className="min-w-0 flex-1">
          <p className="eyebrow text-[10px] text-[#a8893e]">FONCTIONNALITÉ PREMIUM</p>
          <h2 className="mt-1 font-serif text-2xl text-foreground">Débloquez {featureLabel}</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Abonnez-vous à Premium pour accéder à cet onglet et utiliser toutes ses fonctionnalités.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {(plans?.data ?? []).map((plan) => (
              <Button
                key={plan.lookupKey}
                disabled={isLoading || busy !== null}
                onClick={() => void checkout(plan.lookupKey)}
                className="gap-2 border-[#C8A96E] bg-[#E2B93B] text-[#3C1A3C] hover:bg-[#F0CC55]"
              >
                <Award size={15} />
                {plan.plan === 'annual' ? 'Passer à Premium annuel' : 'Passer à Premium mensuel'}
              </Button>
            ))}
          </div>
          {!isLoading && !plans?.data?.length && (
            <p className="mt-4 text-xs text-muted-foreground">Les formules Premium seront bientôt disponibles.</p>
          )}
        </div>
      </div>
    </div>
  );
}