import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

export interface TourStep {
  icon: LucideIcon;
  title: string;
  body: string;
}

interface PageTourProps {
  tourKey: string;
  pageTitle: string;
  pageIcon: LucideIcon;
  steps: TourStep[];
}

export const STORAGE_PREFIX = 'nuptial-tour-seen:';

export function PageTour({ tourKey, pageTitle, pageIcon: PageIcon, steps, forceOpen = 0 }: PageTourProps & { forceOpen?: number }) {
  const { t } = useLanguage();
  const storageKey = STORAGE_PREFIX + tourKey;
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem(storageKey)) {
      // Small delay so the page has time to render before the tour appears
      const t = setTimeout(() => setOpen(true), 400);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [storageKey]);

  // External trigger: increment forceOpen to open the tour programmatically
  useEffect(() => {
    if (forceOpen > 0) {
      setStep(0);
      setOpen(true);
    }
  }, [forceOpen]);

  const close = () => {
    localStorage.setItem(storageKey, '1');
    setOpen(false);
    setStep(0);
  };

  const reopen = () => {
    setStep(0);
    setOpen(true);
  };

  const currentStep = steps[step];
  const StepIcon = currentStep.icon;
  const isFirst = step === 0;
  const isLast = step === steps.length - 1;

  const modal = open ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 backdrop-blur-[2px]"
        style={{ background: 'rgba(30,10,30,0.30)' }}
        onClick={close}
      />

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-[420px] overflow-hidden rounded-3xl bg-card"
        style={{
          boxShadow: '0 28px 64px rgba(60,26,60,0.30), 0 4px 16px rgba(93,45,93,0.14)',
          border: '1px solid rgba(200,180,200,0.40)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header gradient ── */}
        <div
          className="relative px-8 py-7"
          style={{ background: 'linear-gradient(135deg, #3C1A3C 0%, #5D2D5D 55%, #7A4A7A 100%)' }}
        >
          {/* Rim highlight */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
          {/* Gold bar */}
          <div
            className="absolute inset-x-0 bottom-0 h-[2px]"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(200,170,112,0.55), transparent)' }}
          />
          {/* Ambient blob */}
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #C8A96E 0%, transparent 70%)' }}
          />

          {/* Close button */}
          <button
            onClick={close}
            className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white/80"
          >
            <X size={14} />
          </button>

          <div className="flex items-center gap-3">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{
                background: 'rgba(200,170,112,0.18)',
                border: '1px solid rgba(200,170,112,0.40)',
              }}
            >
              <PageIcon size={18} className="text-[#C8A96E]" />
            </span>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-white/40">
                {t('tour.guide')}
              </p>
              <p className="font-serif text-[22px] leading-none text-white">{pageTitle}</p>
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="px-8 py-7">
          {/* Step content */}
          <div className="mb-7 flex gap-4">
            <span
              className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{
                background: 'linear-gradient(135deg, rgba(93,45,93,0.10) 0%, rgba(93,45,93,0.04) 100%)',
                border: '1px solid rgba(93,45,93,0.16)',
              }}
            >
              <StepIcon size={18} className="text-primary" />
            </span>
            <div>
              <p className="mb-1.5 text-[15px] font-semibold text-foreground">{currentStep.title}</p>
              <p className="text-[13px] leading-relaxed text-muted-foreground">{currentStep.body}</p>
            </div>
          </div>

          {/* ── Footer: dots + nav ── */}
          <div className="flex items-center justify-between">
            {/* Step dots */}
            <div className="flex items-center gap-1.5">
              {steps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  aria-label={t('tour.step', { number: i + 1 })}
                  className="h-1.5 rounded-full transition-all duration-250"
                  style={{
                    width: i === step ? '20px' : '6px',
                    background: i === step ? '#5D2D5D' : 'rgba(93,45,93,0.22)',
                  }}
                />
              ))}
            </div>

            {/* Navigation buttons */}
            <div className="flex gap-2">
              {!isFirst && (
                <button
                  onClick={() => setStep((s) => s - 1)}
                  className="flex items-center gap-1 rounded-xl border border-border/60 px-3 py-2 text-[11px] font-medium text-muted-foreground transition hover:bg-muted/40"
                >
                  <ChevronLeft size={13} /> {t('tour.previous')}
                </button>
              )}
              {isLast ? (
                <button
                  onClick={close}
                  className="flex items-center gap-1.5 rounded-xl px-5 py-2 text-[11px] font-semibold text-white transition hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #5D2D5D, #7A4A7A)' }}
                >
                  {t('tour.start')} <ChevronRight size={13} />
                </button>
              ) : (
                <button
                  onClick={() => setStep((s) => s + 1)}
                  className="flex items-center gap-1.5 rounded-xl px-5 py-2 text-[11px] font-semibold text-white transition hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #5D2D5D, #7A4A7A)' }}
                >
                  {t('tour.next')} <ChevronRight size={13} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {typeof window !== 'undefined' && createPortal(modal, document.body)}
      {/* Floating help button — always visible when tour is closed */}
      {!open && (
        <button
          onClick={reopen}
          title="Revoir le guide"
          aria-label="Revoir le guide d'utilisation"
          className="fixed bottom-[88px] right-6 z-40 flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:scale-105 hover:opacity-90"
          style={{
            background: 'linear-gradient(135deg, #5D2D5D, #7A4A7A)',
            boxShadow: '0 4px 16px rgba(93,45,93,0.38)',
          }}
        >
          <HelpCircle size={18} />
        </button>
      )}
    </>
  );
}
