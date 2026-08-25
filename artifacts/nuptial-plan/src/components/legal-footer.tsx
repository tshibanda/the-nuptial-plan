import { Link } from 'wouter';
import { useLanguage } from '@/lib/i18n';

export function LegalFooter({ className = '' }: { className?: string }) {
  const { t } = useLanguage();
  return (
    <footer className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground/75 ${className}`}>
      <Link href="/privacy" className="transition-colors hover:text-primary">
        {t('legal.privacy')}
      </Link>
      <span aria-hidden="true" className="text-border">·</span>
      <Link href="/policy" className="transition-colors hover:text-primary">
        {t('legal.terms')}
      </Link>
    </footer>
  );
}