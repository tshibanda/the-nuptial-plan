import { Crown } from 'lucide-react';
import { usePremiumStatus } from '@/components/premium-page-gate';

export function PremiumBadge() {
  const { isPremium } = usePremiumStatus();

  if (isPremium) return null;

  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#C8A96E]/45 bg-[#C8A96E]/12 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#8A6530]">
      <Crown size={11} strokeWidth={2} />
      Premium
    </span>
  );
}