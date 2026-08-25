import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type AppLanguage = 'en' | 'fr';

export const LANGUAGE_STORAGE_KEY = 'nuptial-plan.language';

const francophoneRegions = new Set([
  'BE', 'BF', 'BI', 'BJ', 'CD', 'CF', 'CG', 'CH', 'CI', 'CM', 'DJ', 'FR', 'GA',
  'GF', 'GG', 'GN', 'GP', 'HT', 'KM', 'LU', 'MC', 'MF', 'MG', 'ML', 'MQ', 'NC',
  'NE', 'PF', 'PM', 'RE', 'RW', 'SC', 'SN', 'TD', 'TG', 'VU', 'WF', 'YT',
]);

export function detectLanguage(): AppLanguage {
  if (typeof navigator === 'undefined') return 'en';
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
  return languages.some((value) => {
    const [language, region] = value.replace('_', '-').split('-');
    return language.toLowerCase() === 'fr' || (region ? francophoneRegions.has(region.toUpperCase()) : false);
  }) ? 'fr' : 'en';
}

export function getStoredLanguage(): AppLanguage | null {
  try {
    const value = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return value === 'en' || value === 'fr' ? value : null;
  } catch {
    return null;
  }
}

const messages = {
  en: {
    'language.english': 'English',
    'language.french': 'Français',
    'language.label': 'Language',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.loading': 'Loading…',
    'common.error': 'Error',
    'common.settings': 'Settings',
    'common.signOut': 'Sign out',
    'landing.tagline': 'The essential wedding planner tool',
    'landing.signIn': 'Sign in',
    'landing.signUp': 'Create an account',
    'landing.mobileTitle': 'The Nuptial Plan on mobile',
    'landing.mobileBody': 'Access your planning workspace more easily in the app.',
    'landing.closeMobilePrompt': 'Close download suggestion',
    'landing.download': 'Download the app',
    'landing.continueWeb': 'Continue on website',
    'landing.footer': 'Wedding planning studio · Planner access only',
    'clerk.signInTitle': 'Sign in',
    'clerk.signInSubtitle': 'Access your planning workspace',
    'clerk.signUpTitle': 'Create an account',
    'clerk.signUpSubtitle': 'Join The Nuptial Plan',
    'legal.privacy': 'Privacy policy',
    'legal.terms': 'Terms of use',
    'attachments.label': 'Attachments',
    'attachments.download': 'Download',
    'premium.feature': 'PREMIUM FEATURE',
    'premium.description': 'Subscribe to Premium to access this section and use all its features.',
    'premium.annual': 'Annual subscription · 12 months',
    'premium.monthly': 'Monthly subscription · 1 month',
    'premium.perMonth': '/ month',
    'premium.restore': 'Restore purchases',
    'premium.unavailable': 'Premium plans will be available soon.',
    'premium.priceUnavailable': 'Price unavailable',
    'tour.step': 'Step {number}',
    'tour.previous': 'Previous',
    'tour.guide': 'User guide',
    'tour.start': 'Get started',
    'tour.next': 'Next',
    'attachments.upload': 'Add file',
    'attachments.uploading': 'Uploading…',
    'attachments.empty': 'No attachment.',
  },
  fr: {
    'language.english': 'English',
    'language.french': 'Français',
    'language.label': 'Langue',
    'common.cancel': 'Annuler',
    'common.save': 'Enregistrer',
    'common.delete': 'Supprimer',
    'common.loading': 'Chargement…',
    'common.error': 'Erreur',
    'common.settings': 'Paramètres',
    'common.signOut': 'Se déconnecter',
    'landing.tagline': "L'indispensable du Wedding Planner",
    'landing.signIn': 'Se connecter',
    'landing.signUp': 'Créer un compte',
    'landing.mobileTitle': 'The Nuptial Plan sur mobile',
    'landing.mobileBody': 'Retrouvez votre espace de planification plus facilement dans l’application.',
    'landing.closeMobilePrompt': 'Fermer la proposition de téléchargement',
    'landing.download': 'Télécharger l’application',
    'landing.continueWeb': 'Continuer sur le site',
    'landing.footer': 'Atelier de planification nuptiale · Accès réservé aux planners',
    'clerk.signInTitle': 'Connexion',
    'clerk.signInSubtitle': 'Accédez à votre espace de planification',
    'clerk.signUpTitle': 'Créer un compte',
    'clerk.signUpSubtitle': 'Rejoignez The Nuptial Plan',
    'legal.privacy': 'Politique de confidentialité',
    'legal.terms': 'Conditions générales d’utilisation',
    'attachments.label': 'Pièces jointes',
    'attachments.download': 'Télécharger',
    'premium.feature': 'FONCTIONNALITÉ PREMIUM',
    'premium.description': 'Abonnez-vous à Premium pour accéder à cet onglet et utiliser toutes ses fonctionnalités.',
    'premium.annual': 'Abonnement annuel · 12 mois',
    'premium.monthly': 'Abonnement mensuel · 1 mois',
    'premium.perMonth': '/ mois',
    'premium.restore': 'Restaurer les achats',
    'premium.unavailable': 'Les formules Premium seront bientôt disponibles.',
    'premium.priceUnavailable': 'Prix indisponible',
    'tour.step': 'Étape {number}',
    'tour.previous': 'Précédent',
    'tour.guide': "Guide d'utilisation",
    'tour.start': 'Commencer',
    'tour.next': 'Suivant',
    'attachments.upload': 'Ajouter un fichier',
    'attachments.uploading': 'Envoi…',
    'attachments.empty': 'Aucun document joint.',
  },
} as const;

type MessageKey = keyof typeof messages.en;
type Interpolation = Record<string, string | number>;

function translate(language: AppLanguage, key: string, values?: Interpolation): string {
  const template = (messages[language] as Record<string, string>)[key]
    ?? (messages.en as Record<string, string>)[key]
    ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(values?.[name] ?? `{${name}}`));
}

export type LanguageContextValue = {
  language: AppLanguage;
  locale: 'en-GB' | 'fr-FR';
  setLanguage: (language: AppLanguage) => void;
  t: (key: MessageKey | string, values?: Interpolation) => string;
  formatDate: (value: Date | string, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatCurrency: (value: number, currency?: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(() => getStoredLanguage() ?? detectLanguage());
  const setLanguage = (next: AppLanguage) => {
    setLanguageState(next);
    try { localStorage.setItem(LANGUAGE_STORAGE_KEY, next); } catch { /* preference remains in memory */ }
  };
  const value = useMemo<LanguageContextValue>(() => {
    const locale = language === 'fr' ? 'fr-FR' : 'en-GB';
    return {
      language,
      locale,
      setLanguage,
      t: (key, values) => translate(language, key, values),
      formatDate: (date, options) => new Intl.DateTimeFormat(locale, options).format(
        typeof date === 'string' ? new Date(date) : date,
      ),
      formatNumber: (number, options) => new Intl.NumberFormat(locale, options).format(number),
      formatCurrency: (amount, currency = 'EUR') => new Intl.NumberFormat(locale, {
        style: 'currency', currency, maximumFractionDigits: 2,
      }).format(amount),
    };
  }, [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}