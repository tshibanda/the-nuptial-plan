import { Languages } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

export function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage, t } = useLanguage();
  return (
    <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
      {!compact && <><Languages size={15} aria-hidden="true" /><span>{t('language.label')}</span></>}
      <select
        value={language}
        onChange={(event) => setLanguage(event.target.value as 'en' | 'fr')}
        aria-label={t('language.label')}
        className="rounded-lg border border-border/60 bg-white/70 px-2 py-1.5 text-xs font-medium text-foreground outline-none transition focus:border-primary"
        data-testid="select-language"
      >
        <option value="en">{t('language.english')}</option>
        <option value="fr">{t('language.french')}</option>
      </select>
    </label>
  );
}