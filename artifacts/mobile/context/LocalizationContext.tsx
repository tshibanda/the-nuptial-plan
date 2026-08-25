import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type AppLanguage = 'fr' | 'en';

const LANGUAGE_STORAGE_KEY = '@nuptial-plan/language';
const FRANCOPHONE_REGIONS = new Set([
  'BE', 'BF', 'BI', 'BJ', 'CA', 'CD', 'CF', 'CG', 'CH', 'CI', 'CM', 'DJ', 'FR',
  'GA', 'GF', 'GN', 'GP', 'HT', 'KM', 'LU', 'MA', 'MC', 'MG', 'ML', 'MQ', 'MU',
  'NC', 'NE', 'PF', 'RE', 'RW', 'SC', 'SN', 'TD', 'TG', 'TN', 'VU', 'WF', 'YT',
]);

function detectLanguage(): AppLanguage {
  // Intl is available in Expo and React Native Web without a native localization
  // dependency. Keep the original device locale for formatting in the provider.
  const locale = Intl.DateTimeFormat().resolvedOptions().locale || 'en-US';
  const [language, region] = locale.replace('_', '-').split('-');
  return language.toLowerCase() === 'fr' || (region && FRANCOPHONE_REGIONS.has(region.toUpperCase()))
    ? 'fr'
    : 'en';
}

export const translations = {
  fr: {
    'common.cancel': 'Annuler', 'common.save': 'Enregistrer', 'common.delete': 'Supprimer',
    'common.close': 'Fermer', 'common.back': 'Retour', 'common.loading': 'Chargement…',
    'common.error': 'Erreur', 'common.active': 'Actif', 'common.more': 'Plus',
    'auth.tagline': 'L’indispensable du Wedding Planner', 'auth.signIn': 'Connexion',
    'auth.signUp': 'Créer un compte', 'auth.continueGoogle': 'Continuer avec Google',
    'auth.continueApple': 'Continuer avec Apple', 'auth.orEmail': 'ou par e-mail',
    'auth.email': 'Adresse e-mail', 'auth.password': 'Mot de passe',
    'auth.emailPlaceholder': 'vous@exemple.fr', 'auth.termsShort': 'CGU',
    'auth.login': 'Se connecter', 'auth.noAccount': 'Pas encore de compte ? ',
    'auth.alreadyAccount': 'Déjà un compte ? ', 'auth.register': 'S’inscrire',
    'auth.continuingTerms': 'En continuant, vous acceptez nos ',
    'auth.creatingTerms': 'En créant un compte, vous acceptez nos ',
    'auth.andPrivacy': ' et notre ', 'auth.privacy': 'politique de confidentialité',
    'auth.verificationRequired': 'Vérification requise', 'auth.enterEmailCode': 'Entrez le code reçu par e-mail.',
    'auth.verifyAddress': 'Vérifiez votre adresse', 'auth.codeSentTo': 'Un code a été envoyé à',
    'auth.verify': 'Vérifier', 'auth.resendCode': 'Renvoyer le code',
    'offline.mode': 'Mode hors-ligne', 'offline.lastSync': 'Synchro',
    'offline.title': 'Vous êtes hors connexion',
    'offline.body': 'La connexion à Internet semble indisponible. Reconnectez-vous puis actualisez pour synchroniser vos données.',
    'offline.refresh': 'Rafraîchir la page',
    'settings.deleteAccountTitle': 'Supprimer le compte',
    'settings.deleteAccountMessage': 'Cette action efface définitivement vos données et résilie les abonnements web actifs. Pour un achat Apple ou Google, pensez à le résilier dans votre boutique avant de continuer.',
    'settings.deleteForever': 'Supprimer définitivement', 'settings.accountDeleted': 'Compte supprimé',
    'settings.accountDeletedMessage': 'Votre compte et vos données ont été supprimés définitivement.',
    'settings.deleteFailed': 'Suppression impossible', 'settings.deleteFailedMessage': 'Nous n’avons pas pu supprimer le compte. Réessayez dans quelques instants.',
    'settings.reviewTitle': 'Votre avis compte', 'settings.reviewMessage': 'Après quelques jours avec The Nuptial Plan, souhaitez-vous nous laisser une note ou un avis sur l’App Store ?',
    'settings.later': 'Plus tard', 'settings.review': 'Laisser un avis',
    'settings.deleteWeddingTitle': 'Supprimer ce dossier', 'settings.deleteWeddingMessage': 'Toutes les données de « {name} » seront définitivement supprimées (invités, prestataires, budget, paiements…). Cette action est irréversible.',
    'settings.weddingDeleted': 'Dossier supprimé', 'settings.weddingDeletedMessage': 'Le mariage « {name} » a été supprimé.',
    'settings.weddingDeleteError': 'Impossible de supprimer ce dossier. Réessayez.',
    'settings.supportMessage': 'Pour toute assistance, contactez-nous à contact@thenuptialplan.com',
    'settings.dangerHint': 'La suppression est définitive et irréversible. Toutes les données liées à ce mariage seront perdues.',
    'bug.descriptionRequired': 'Description requise', 'bug.descriptionRequiredMessage': 'Décrivez le problème rencontré avant d’envoyer votre rapport.',
    'bug.hello': 'Bonjour,', 'bug.reportIntro': 'Je souhaite signaler un bug dans The Nuptial Plan.',
    'bug.issueDescription': 'Description du problème :', 'bug.steps': 'Étapes pour reproduire :',
    'bug.notProvided': 'Non renseignées', 'bug.deviceVersion': 'Appareil / version',
    'bug.contactEmail': 'Adresse de contact', 'bug.thanks': 'Merci.', 'bug.subject': 'Rapport de bug — The Nuptial Plan',
    'bug.emailUnavailable': 'E-mail indisponible', 'bug.emailUnavailableMessage': 'Aucune application e-mail n’est configurée sur cet appareil. Vous pouvez écrire à {email}.',
    'bug.openEmailFailed': 'Impossible d’ouvrir l’e-mail', 'bug.openEmailFailedMessage': 'Veuillez envoyer votre rapport à {email}.',
    'bug.backSettings': 'Retour aux paramètres', 'bug.support': 'AIDE & SUPPORT',
    'bug.title': 'Signaler un bug', 'bug.subtitle': 'Aidez-nous à améliorer votre expérience. Décrivez ce qui s’est passé et nous vous répondrons dès que possible.',
    'bug.info': 'Votre rapport sera préparé dans un e-mail adressé à ', 'bug.issueLabel': 'DESCRIPTION DU PROBLÈME *',
    'bug.issuePlaceholder': 'Que s’est-il passé ?', 'bug.stepsLabel': 'ÉTAPES POUR REPRODUIRE',
    'bug.stepsPlaceholder': '1. Ouvrir…\n2. Appuyer sur…\n3. Observer…', 'bug.emailLabel': 'VOTRE E-MAIL (FACULTATIF)',
    'bug.emailPlaceholder': 'Pour recevoir une réponse', 'bug.technicalInfo': 'Informations techniques jointes :',
    'bug.prepareEmail': 'Préparer l’e-mail',
    'tabs.dashboard': 'Aperçu', 'tabs.weddings': 'Mariages', 'tabs.calendar': 'Agenda',
    'tabs.vendors': 'Prestataires', 'tabs.guests': 'Invités', 'tabs.budget': 'Budget',
    'tabs.payments': 'Paiements', 'tabs.contracts': 'Contrats', 'tabs.documents': 'Documents',
    'tabs.settings': 'Paramètres', 'tabs.profile': 'Profil', 'tabs.moodboards': 'Moodboards',
    'tabs.business': 'Business', 'tabs.contacts': 'Carnet d’adresses', 'tabs.networks': 'Mes réseaux',
    'tabs.reservations': 'Mes réservations', 'tabs.appointments': 'Mes rendez-vous',
    'tabs.timeline': 'Rétro-planning', 'tabs.weddingDay': 'Jour-J',
    'navigation.fullMenu': 'Menu complet', 'navigation.navigation': 'NAVIGATION',
    'navigation.customizeBottomMenu': 'Personnaliser le menu du bas',
    'navigation.chooseFiveTabs': 'Choisissez les 5 onglets que vous utilisez le plus.',
    'navigation.bottomMenu': 'Menu du bas', 'navigation.tabsSelected': 'onglets sélectionnés',
    'navigation.chooseTabs': 'Appuyez sur les onglets à afficher dans la barre de navigation.',
    'navigation.primary': '↓ barre',
    'settings.title': 'Paramètres', 'settings.subtitle': 'L’indispensable du Wedding Planner',
    'settings.weddingFile': 'DOSSIER DE MARIAGE', 'settings.activeWedding': 'MARIAGE ACTIF',
    'settings.application': 'APPLICATION', 'settings.language': 'Langue', 'settings.french': 'Français',
    'settings.english': 'English', 'settings.notifications': 'Notifications',
    'settings.help': 'Aide & support', 'settings.reportBug': 'Signaler un bug',
    'settings.leaveReview': 'Laisser un avis', 'settings.version': 'Version',
    'settings.legal': 'INFORMATIONS LÉGALES', 'settings.privacy': 'Politique de confidentialité',
    'settings.terms': 'Conditions générales d’utilisation', 'settings.danger': 'ZONE DANGER',
    'settings.deleteFile': 'Supprimer ce dossier', 'settings.deleting': 'Suppression…',
    'settings.deleteAccount': 'Supprimer le compte', 'settings.guests': 'invités',
    'status.confirmed': 'Confirmé', 'status.deposit_paid': 'Acompte versé',
    'status.awaiting_contract': 'Contrat en attente', 'status.cancelled': 'Annulé',
    'status.pending': 'En attente', 'status.declined': 'Décliné', 'status.paid': 'Réglé',
    'status.overdue': 'En retard', 'status.scheduled': 'Programmé', 'status.due': 'À régler',
  },
  en: {
    'common.cancel': 'Cancel', 'common.save': 'Save', 'common.delete': 'Delete',
    'common.close': 'Close', 'common.back': 'Back', 'common.loading': 'Loading…',
    'common.error': 'Error', 'common.active': 'Active', 'common.more': 'More',
    'auth.tagline': 'Wedding Planner essentials', 'auth.signIn': 'Sign in',
    'auth.signUp': 'Create an account', 'auth.continueGoogle': 'Continue with Google',
    'auth.continueApple': 'Continue with Apple', 'auth.orEmail': 'or with email',
    'auth.email': 'Email address', 'auth.password': 'Password',
    'auth.emailPlaceholder': 'you@example.com', 'auth.termsShort': 'Terms',
    'auth.login': 'Sign in', 'auth.noAccount': 'No account yet? ',
    'auth.alreadyAccount': 'Already have an account? ', 'auth.register': 'Sign up',
    'auth.continuingTerms': 'By continuing, you agree to our ',
    'auth.creatingTerms': 'By creating an account, you agree to our ',
    'auth.andPrivacy': ' and our ', 'auth.privacy': 'privacy policy',
    'auth.verificationRequired': 'Verification required', 'auth.enterEmailCode': 'Enter the code sent by email.',
    'auth.verifyAddress': 'Verify your address', 'auth.codeSentTo': 'A code was sent to',
    'auth.verify': 'Verify', 'auth.resendCode': 'Resend code',
    'offline.mode': 'Offline mode', 'offline.lastSync': 'Synced',
    'offline.title': 'You are offline',
    'offline.body': 'Your Internet connection appears unavailable. Reconnect, then refresh to sync your data.',
    'offline.refresh': 'Refresh page',
    'settings.deleteAccountTitle': 'Delete account',
    'settings.deleteAccountMessage': 'This permanently erases your data and cancels active web subscriptions. For an Apple or Google purchase, cancel it in your store before continuing.',
    'settings.deleteForever': 'Delete permanently', 'settings.accountDeleted': 'Account deleted',
    'settings.accountDeletedMessage': 'Your account and data have been permanently deleted.',
    'settings.deleteFailed': 'Unable to delete', 'settings.deleteFailedMessage': 'We could not delete your account. Please try again shortly.',
    'settings.reviewTitle': 'Your feedback matters', 'settings.reviewMessage': 'After a few days with The Nuptial Plan, would you like to leave a rating or review on the App Store?',
    'settings.later': 'Later', 'settings.review': 'Leave a review',
    'settings.deleteWeddingTitle': 'Delete this file', 'settings.deleteWeddingMessage': 'All data for “{name}” will be permanently deleted (guests, vendors, budget, payments…). This action cannot be undone.',
    'settings.weddingDeleted': 'File deleted', 'settings.weddingDeletedMessage': 'The wedding “{name}” was deleted.',
    'settings.weddingDeleteError': 'Unable to delete this file. Please try again.',
    'settings.supportMessage': 'For assistance, contact us at contact@thenuptialplan.com',
    'settings.dangerHint': 'Deletion is permanent and irreversible. All data linked to this wedding will be lost.',
    'bug.descriptionRequired': 'Description required', 'bug.descriptionRequiredMessage': 'Describe the issue before sending your report.',
    'bug.hello': 'Hello,', 'bug.reportIntro': 'I would like to report a bug in The Nuptial Plan.',
    'bug.issueDescription': 'Issue description:', 'bug.steps': 'Steps to reproduce:',
    'bug.notProvided': 'Not provided', 'bug.deviceVersion': 'Device / version',
    'bug.contactEmail': 'Contact email', 'bug.thanks': 'Thank you.', 'bug.subject': 'Bug report — The Nuptial Plan',
    'bug.emailUnavailable': 'Email unavailable', 'bug.emailUnavailableMessage': 'No email app is configured on this device. You can write to {email}.',
    'bug.openEmailFailed': 'Unable to open email', 'bug.openEmailFailedMessage': 'Please send your report to {email}.',
    'bug.backSettings': 'Back to settings', 'bug.support': 'HELP & SUPPORT',
    'bug.title': 'Report a bug', 'bug.subtitle': 'Help us improve your experience. Describe what happened and we will reply as soon as possible.',
    'bug.info': 'Your report will be prepared in an email addressed to ', 'bug.issueLabel': 'ISSUE DESCRIPTION *',
    'bug.issuePlaceholder': 'What happened?', 'bug.stepsLabel': 'STEPS TO REPRODUCE',
    'bug.stepsPlaceholder': '1. Open…\n2. Tap…\n3. Observe…', 'bug.emailLabel': 'YOUR EMAIL (OPTIONAL)',
    'bug.emailPlaceholder': 'To receive a reply', 'bug.technicalInfo': 'Technical information attached:',
    'bug.prepareEmail': 'Prepare email',
    'tabs.dashboard': 'Overview', 'tabs.weddings': 'Weddings', 'tabs.calendar': 'Calendar',
    'tabs.vendors': 'Vendors', 'tabs.guests': 'Guests', 'tabs.budget': 'Budget',
    'tabs.payments': 'Payments', 'tabs.contracts': 'Contracts', 'tabs.documents': 'Documents',
    'tabs.settings': 'Settings', 'tabs.profile': 'Profile', 'tabs.moodboards': 'Moodboards',
    'tabs.business': 'Business', 'tabs.contacts': 'Address book', 'tabs.networks': 'My networks',
    'tabs.reservations': 'My reservations', 'tabs.appointments': 'My appointments',
    'tabs.timeline': 'Timeline', 'tabs.weddingDay': 'Wedding day',
    'navigation.fullMenu': 'Full menu', 'navigation.navigation': 'NAVIGATION',
    'navigation.customizeBottomMenu': 'Customize bottom menu',
    'navigation.chooseFiveTabs': 'Choose the 5 tabs you use most.',
    'navigation.bottomMenu': 'Bottom menu', 'navigation.tabsSelected': 'tabs selected',
    'navigation.chooseTabs': 'Tap the tabs to show in the navigation bar.',
    'navigation.primary': '↓ bar',
    'settings.title': 'Settings', 'settings.subtitle': 'Wedding Planner essentials',
    'settings.weddingFile': 'WEDDING FILE', 'settings.activeWedding': 'ACTIVE WEDDING',
    'settings.application': 'APPLICATION', 'settings.language': 'Language', 'settings.french': 'French',
    'settings.english': 'English', 'settings.notifications': 'Notifications',
    'settings.help': 'Help & support', 'settings.reportBug': 'Report a bug',
    'settings.leaveReview': 'Leave a review', 'settings.version': 'Version',
    'settings.legal': 'LEGAL INFORMATION', 'settings.privacy': 'Privacy policy',
    'settings.terms': 'Terms of use', 'settings.danger': 'DANGER ZONE',
    'settings.deleteFile': 'Delete this file', 'settings.deleting': 'Deleting…',
    'settings.deleteAccount': 'Delete account', 'settings.guests': 'guests',
    'status.confirmed': 'Confirmed', 'status.deposit_paid': 'Deposit paid',
    'status.awaiting_contract': 'Contract pending', 'status.cancelled': 'Cancelled',
    'status.pending': 'Pending', 'status.declined': 'Declined', 'status.paid': 'Paid',
    'status.overdue': 'Overdue', 'status.scheduled': 'Scheduled', 'status.due': 'Due',
  },
} as const;

export type TranslationKey = keyof typeof translations.fr;
type LocalizationContextValue = {
  language: AppLanguage;
  locale: string;
  isLoading: boolean;
  setLanguage: (language: AppLanguage) => Promise<void>;
  t: (key: TranslationKey) => string;
};

const LocalizationContext = createContext<LocalizationContextValue | null>(null);

export function LocalizationProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(detectLanguage);
  const [isLoading, setIsLoading] = useState(true);
  const deviceLocale = Intl.DateTimeFormat().resolvedOptions().locale || 'en-US';

  useEffect(() => {
    let mounted = true;
    void AsyncStorage.getItem(LANGUAGE_STORAGE_KEY).then((saved) => {
      if (mounted && (saved === 'fr' || saved === 'en')) setLanguageState(saved);
    }).finally(() => { if (mounted) setIsLoading(false); });
    return () => { mounted = false; };
  }, []);

  const setLanguage = useCallback(async (nextLanguage: AppLanguage) => {
    setLanguageState(nextLanguage);
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
  }, []);

  const value = useMemo<LocalizationContextValue>(() => ({
    language,
    // Preserve a regional French/English locale when possible for dates and numbers.
    locale: deviceLocale.toLowerCase().startsWith(language) ? deviceLocale : language === 'fr' ? 'fr-FR' : 'en-US',
    isLoading,
    setLanguage,
    t: (key) => translations[language][key],
  }), [deviceLocale, isLoading, language, setLanguage]);

  return <LocalizationContext.Provider value={value}>{children}</LocalizationContext.Provider>;
}

export function useLocalization(): LocalizationContextValue {
  const context = useContext(LocalizationContext);
  if (!context) throw new Error('useLocalization must be used within LocalizationProvider');
  return context;
}