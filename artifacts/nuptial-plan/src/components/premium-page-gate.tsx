import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Award, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n';

type SubscriptionStatus = { subscription: { status: string; trialEndsAt: string | null } | null };
type PlansResponse = { data: Array<{ lookupKey: string; plan: 'monthly' | 'annual'; amount: number | null; currency?: string }> };

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
  const { t, formatCurrency } = useLanguage();
  const { data: plans, isLoading } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const response = await fetch('/api/subscription/plans', { credentials: 'include' });
      if (!response.ok) throw new Error('Plans unavailable');
      return response.json() as Promise<PlansResponse>;
    },
  });
  const [busy, setBusy] = useState<string | null>(null);
  const queryClient = useQueryClient();

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
  const restore = async () => {
    setBusy('restore');
    try {
      await queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
      await queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
    } finally {
      setBusy(null);
    }
  };
  const price = (amount: number | null, currency = 'EUR') => amount == null
    ? t('premium.priceUnavailable')
    : formatCurrency(amount / 100, currency);

  return (
    <div className="rounded-2xl border border-[#C8A96E]/45 bg-[#F7EEDB]/55 p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="rounded-xl bg-[#5D2D5D] p-3 text-[#E2B93B]"><Lock size={19} /></div>
        <div className="min-w-0 flex-1">
          <p className="eyebrow text-[10px] text-[#a8893e]">{t('premium.feature')}</p>
          <h2 className="mt-1 font-serif text-2xl text-foreground">The Nuptial Plan Premium</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            {t('premium.description')}
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {(plans?.data ?? []).map((plan) => (
              <Button
                key={plan.lookupKey}
                disabled={isLoading || busy !== null}
                onClick={() => void checkout(plan.lookupKey)}
                className="h-auto justify-start border-[#C8A96E] bg-[#E2B93B] px-4 py-3 text-left text-white hover:bg-[#F0CC55] hover:text-white"
              >
                <Award size={15} />
                <span>
                  <span className="block">The Nuptial Plan Premium</span>
                  <span className="block text-xs font-normal opacity-90">
                    {plan.plan === 'annual' ? t('premium.annual') : t('premium.monthly')} · {price(plan.amount, plan.currency)}
                    {plan.plan === 'annual' && plan.amount != null ? ` · ${price(Math.round(plan.amount / 12), plan.currency)} ${t('premium.perMonth')}` : ''}
                  </span>
                </span>
              </Button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            <button type="button" onClick={() => void restore()} disabled={busy !== null} className="font-semibold text-primary underline underline-offset-4">
              {t('premium.restore')}
            </button>
            <a href="/privacy" className="text-primary underline underline-offset-4">{t('legal.privacy')}</a>
            <a href="/policy" className="text-primary underline underline-offset-4">{t('legal.terms')}</a>
          </div>
          {!isLoading && !plans?.data?.length && (
            <p className="mt-4 text-xs text-muted-foreground">{t('premium.unavailable')}</p>
          )}
        </div>
      </div>
    </div>
  );
}