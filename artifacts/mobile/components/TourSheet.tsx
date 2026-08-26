/**
 * TourSheet — First-visit guided tour modal
 *
 * Jardin Parisien visual style: plum gradient header, step dots,
 * Suivant / Commencer navigation. Content is in French.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useTour } from '@/hooks/useTour';
import { SERIF, SANS, SANS_MEDIUM, SANS_SEMIBOLD } from '@/constants/fonts';
import { useLocalization } from '@/context/LocalizationContext';

export interface TourStep {
  icon: string;
  title: string;
  description: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  steps: TourStep[];
}

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SHEET_H = Math.min(480, SCREEN_HEIGHT * 0.65);

export function TourSheet({ visible, onClose, steps }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { language } = useLocalization();
  const en = language === 'en';
  const [step, setStep] = useState(0);

  // Reset to first step whenever the sheet becomes visible
  useEffect(() => {
    if (visible) setStep(0);
  }, [visible]);

  // Slide-up animation
  const translate = useRef(new Animated.Value(SHEET_H)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translate, {
          toValue: 0,
          useNativeDriver: true,
          damping: 22,
          stiffness: 220,
          mass: 0.8,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translate, {
          toValue: SHEET_H,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, translate, opacity]);

  // Content fade between steps
  const contentOpacity = useRef(new Animated.Value(1)).current;

  const goToStep = (next: number) => {
    Animated.sequence([
      Animated.timing(contentOpacity, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(contentOpacity, { toValue: 1, duration: 160, useNativeDriver: true }),
    ]).start();
    setStep(next);
  };

  const handleNext = () => {
    if (step < steps.length - 1) {
      goToStep(step + 1);
    } else {
      onClose();
    }
  };

  if (!visible) return null;

  const current = steps[step] ?? steps[0];
  const isLast = step === steps.length - 1;

  const bottomPad = Platform.OS === 'ios' ? insets.bottom + 12 : 20;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Scrim */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[ts.backdrop, { opacity }]} />
      </TouchableWithoutFeedback>

      {/* Sheet */}
      <Animated.View
        style={[
          ts.sheet,
          {
            height: SHEET_H,
            paddingBottom: bottomPad,
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            transform: [{ translateY: translate }],
            ...(Platform.OS === 'web'
              ? { boxShadow: '0 -8px 32px rgba(30,10,30,0.22), 0 -2px 8px rgba(30,10,30,0.12)' } as any
              : Platform.OS === 'ios'
                ? { shadowColor: '#1A091A', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.16, shadowRadius: 20 }
                : { elevation: 18 }),
          },
        ]}
      >
        {/* ── Plum gradient header ── */}
        <LinearGradient
          colors={['#3C1A3C', '#5D2D5D', '#7A4A7A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={ts.header}
        >
          {/* Decorative blobs */}
          <View style={[ts.blob, { top: -20, right: -20, width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(200,170,112,0.14)' }]} />
          <View style={[ts.blob, { bottom: -10, left: -10, width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(204,140,148,0.12)' }]} />
          {/* Top sheen */}
          <LinearGradient
            colors={['rgba(255,255,255,0.10)', 'transparent']}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          {/* Gold top bar */}
          <View style={ts.goldBar} />

          {/* Eyebrow */}
          <Text style={[ts.eyebrow, { fontFamily: SANS_SEMIBOLD }]}>{en ? 'SCREEN GUIDE' : 'GUIDE DE L’ÉCRAN'}</Text>

          {/* Icon circle */}
          <Animated.View style={[ts.iconCircle, { opacity: contentOpacity }]}>
            <Feather name={current.icon as any} size={26} color="#C8A96E" />
          </Animated.View>

          {/* Step dots in header */}
          <View style={ts.dotRow}>
            {steps.map((_, i) => (
              <View
                key={i}
                style={[
                  ts.dot,
                  i === step
                    ? { backgroundColor: '#C8A96E', width: 18 }
                    : { backgroundColor: 'rgba(200,170,112,0.35)', width: 6 },
                ]}
              />
            ))}
          </View>

          {/* Close button */}
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={ts.closeBtn}
          >
            <Feather name="x" size={14} color="rgba(251,245,251,0.70)" />
          </TouchableOpacity>
        </LinearGradient>

        {/* ── Step content ── */}
        <Animated.View style={[ts.body, { opacity: contentOpacity }]}>
          <Text style={[ts.stepTitle, { fontFamily: SERIF, color: colors.foreground }]}>
            {current.title}
          </Text>
          <Text style={[ts.stepDesc, { fontFamily: SANS, color: colors.mutedForeground }]}>
            {current.description}
          </Text>
        </Animated.View>

        {/* ── Navigation footer ── */}
        <View style={[ts.footer, { borderTopColor: colors.border }]}>
          {/* Step counter */}
          <Text style={[ts.counter, { fontFamily: SANS_MEDIUM, color: colors.mutedForeground }]}>
            {step + 1} / {steps.length}
          </Text>

          <View style={ts.navBtns}>
            {step > 0 && (
              <TouchableOpacity
                onPress={() => goToStep(step - 1)}
                activeOpacity={0.75}
                style={[ts.backBtn, { borderColor: colors.border }]}
              >
                <Feather name="chevron-left" size={14} color={colors.mutedForeground} />
                <Text style={[ts.backLabel, { fontFamily: SANS_MEDIUM, color: colors.mutedForeground }]}>
                  {en ? 'Back' : 'Retour'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={handleNext}
              activeOpacity={0.82}
              style={ts.nextBtn}
            >
              <LinearGradient
                colors={['#5D2D5D', '#3C1A3C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={ts.nextGrad}
              >
                <View style={ts.nextRim} />
                <Text style={[ts.nextLabel, { fontFamily: SANS_SEMIBOLD }]}>
                  {isLast ? (en ? 'Start' : 'Commencer') : (en ? 'Next' : 'Suivant')}
                </Text>
                {!isLast && <Feather name="arrow-right" size={14} color="#FBF5FB" />}
                {isLast && <Feather name="check" size={14} color="#C8A96E" />}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

// ── "?" floating help button ───────────────────────────────────────────────────
interface HelpFabProps {
  onPress: () => void;
  bottom?: number;
}

export function TourHelpFab({ onPress, bottom = 96 }: HelpFabProps) {
  const colors = useColors();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.82}
      style={[
        fab.btn,
        {
          bottom,
          backgroundColor: colors.card,
          borderColor: colors.border,
          ...(Platform.OS === 'web'
            ? { boxShadow: '0 2px 10px rgba(93,45,93,0.18), 0 1px 4px rgba(93,45,93,0.10)' } as any
            : Platform.OS === 'ios'
              ? { shadowColor: '#3C1A3C', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.14, shadowRadius: 8 }
              : { elevation: 4 }),
        },
      ]}
    >
      <Text style={[fab.label, { fontFamily: SANS_SEMIBOLD, color: colors.plum }]}>?</Text>
    </TouchableOpacity>
  );
}

const DEFAULT_HELP_STEPS: Record<'fr' | 'en', TourStep[]> = {
  fr: [
    {
      icon: 'grid',
      title: 'Votre espace de planification',
      description: 'Retrouvez vos mariages, invités, prestataires, budget et documents depuis la navigation principale.',
    },
    {
      icon: 'help-circle',
      title: 'Besoin d’aide ?',
      description: 'Le bouton « ? » reste disponible en bas de l’écran, quelle que soit la page consultée.',
    },
    {
      icon: 'heart',
      title: 'Nuptia',
      description: 'Utilisez l’assistante Nuptia pour poser vos questions sur l’organisation de votre mariage.',
    },
  ],
  en: [
    {
      icon: 'grid',
      title: 'Your planning space',
      description: 'Find your weddings, guests, vendors, budget and documents from the main navigation.',
    },
    {
      icon: 'help-circle',
      title: 'Need help?',
      description: 'The “?” button remains available at the bottom of every screen.',
    },
    {
      icon: 'heart',
      title: 'Nuptia',
      description: 'Use the Nuptia assistant to ask questions about organizing your wedding.',
    },
  ],
};

const TAB_HELP_STEPS: Record<string, Record<'fr' | 'en', TourStep[]>> = {
  index: {
    fr: [
      { icon: 'home', title: "Bienvenue sur l'Aperçu", description: "Cette page résume l'essentiel de votre mariage : compte à rebours, invités confirmés, prestataires et budget engagé." },
      { icon: 'grid', title: 'Métriques clés', description: "Les cartes colorées vous donnent un coup d'œil instantané sur vos chiffres. Tirez vers le bas pour actualiser." },
      { icon: 'calendar', title: 'Événements à venir', description: "Retrouvez ici vos prochains rendez-vous et jalons. Appuyez sur un événement pour accéder à l'agenda complet." },
    ],
    en: [
      { icon: 'home', title: 'Welcome to Overview', description: 'This page summarizes your wedding essentials: countdown, confirmed guests, vendors, and committed budget.' },
      { icon: 'grid', title: 'Key metrics', description: 'The colorful cards provide an instant view of your figures. Pull down to refresh.' },
      { icon: 'calendar', title: 'Upcoming events', description: 'Find your next appointments and milestones here. Tap an event to open the full calendar.' },
    ],
  },
  mariages: {
    fr: [
      { icon: 'heart', title: 'Vos mariages', description: 'Retrouvez ici tous les mariages que vous gérez et leurs informations principales.' },
      { icon: 'check-circle', title: 'Mariage actif', description: "Appuyez sur une carte pour sélectionner le mariage affiché dans toute l'application." },
      { icon: 'calendar', title: 'Compte à rebours', description: 'Le compte à rebours vous rappelle le nombre de jours avant chaque cérémonie.' },
    ],
    en: [
      { icon: 'heart', title: 'Your weddings', description: 'Find all the weddings you manage and their key information here.' },
      { icon: 'check-circle', title: 'Active wedding', description: 'Tap a card to select the wedding shown throughout the app.' },
      { icon: 'calendar', title: 'Countdown', description: 'The countdown reminds you how many days remain before each ceremony.' },
    ],
  },
  evenements: {
    fr: [
      { icon: 'calendar', title: 'Votre agenda', description: 'Gérez tous vos événements et rendez-vous de préparation du mariage en un seul endroit.' },
      { icon: 'grid', title: 'Deux vues au choix', description: "Basculez entre la vue Liste et la vue Calendrier grâce aux boutons en haut de l'écran." },
      { icon: 'plus-circle', title: 'Ajouter un événement', description: 'Appuyez sur le bouton + pour créer un nouvel événement ou rendez-vous.' },
    ],
    en: [
      { icon: 'calendar', title: 'Your calendar', description: 'Manage all your wedding-preparation events and appointments in one place.' },
      { icon: 'grid', title: 'Two views to choose from', description: 'Switch between List and Calendar views with the buttons at the top of the screen.' },
      { icon: 'plus-circle', title: 'Add an event', description: 'Tap the + button to create a new event or appointment.' },
    ],
  },
  prestataires: {
    fr: [
      { icon: 'briefcase', title: 'Votre équipe', description: 'Retrouvez ici les prestataires qui contribuent à votre mariage.' },
      { icon: 'search', title: 'Rechercher un prestataire', description: 'Utilisez la recherche pour retrouver rapidement un prestataire par son nom ou sa catégorie.' },
      { icon: 'plus-circle', title: 'Ajouter un prestataire', description: 'Appuyez sur Ajouter pour créer une fiche ou importer un contact existant.' },
    ],
    en: [
      { icon: 'briefcase', title: 'Your team', description: 'Find the vendors contributing to your wedding here.' },
      { icon: 'search', title: 'Find a vendor', description: 'Use search to quickly find a vendor by name or category.' },
      { icon: 'plus-circle', title: 'Add a vendor', description: 'Tap Add to create a vendor card or import an existing contact.' },
    ],
  },
  invites: {
    fr: [
      { icon: 'users', title: 'Vos invités', description: 'Consultez et gérez la liste des invités de votre mariage.' },
      { icon: 'filter', title: 'Filtres RSVP', description: 'Appuyez sur un filtre pour afficher les invités confirmés, en attente ou déclinés.' },
      { icon: 'upload', title: 'Importer depuis Excel', description: 'Utilisez l’icône Importer pour ajouter un fichier .xlsx ou .csv depuis votre téléphone.' },
    ],
    en: [
      { icon: 'users', title: 'Your guests', description: 'View and manage the guest list for your wedding.' },
      { icon: 'filter', title: 'RSVP filters', description: 'Tap a filter to show confirmed, pending, or declined guests.' },
      { icon: 'upload', title: 'Import from Excel', description: 'Use the Import icon to add an .xlsx or .csv file from your phone.' },
    ],
  },
  budget: {
    fr: [
      { icon: 'pie-chart', title: 'Votre budget', description: 'Suivez les dépenses prévues et engagées pour garder le mariage sous contrôle.' },
      { icon: 'bar-chart-2', title: 'Répartition', description: 'Consultez la répartition par catégorie et appuyez sur une catégorie pour voir ses détails.' },
      { icon: 'plus-circle', title: 'Gérer les catégories', description: 'Ajoutez ou modifiez une catégorie pour adapter le budget à votre mariage.' },
    ],
    en: [
      { icon: 'pie-chart', title: 'Your budget', description: 'Track planned and committed spending to keep the wedding on budget.' },
      { icon: 'bar-chart-2', title: 'Breakdown', description: 'Review the breakdown by category and tap a category to see its details.' },
      { icon: 'plus-circle', title: 'Manage categories', description: 'Add or edit a category to fit the budget to your wedding.' },
    ],
  },
  paiements: {
    fr: [
      { icon: 'credit-card', title: 'Vos paiements', description: 'Centralisez les paiements et acomptes liés à vos prestataires.' },
      { icon: 'filter', title: 'Suivre les statuts', description: 'Repérez rapidement les paiements programmés, réglés ou en retard.' },
      { icon: 'plus-circle', title: 'Ajouter un paiement', description: 'Ajoutez un paiement pour conserver une vision fiable de vos dépenses.' },
    ],
    en: [
      { icon: 'credit-card', title: 'Your payments', description: 'Keep vendor payments and deposits together in one place.' },
      { icon: 'filter', title: 'Track statuses', description: 'Quickly spot scheduled, paid, or overdue payments.' },
      { icon: 'plus-circle', title: 'Add a payment', description: 'Add a payment to keep your spending overview accurate.' },
    ],
  },
  contrats: {
    fr: [
      { icon: 'file-text', title: 'Vos contrats', description: 'Retrouvez ici tous vos contrats prestataires et les montants associés.' },
      { icon: 'search', title: 'Recherche rapide', description: 'Utilisez la barre de recherche pour trouver un contrat par nom de prestataire.' },
      { icon: 'check-circle', title: 'Statut du contrat', description: 'Chaque contrat affiche son statut et le montant total engagé.' },
    ],
    en: [
      { icon: 'file-text', title: 'Your contracts', description: 'Find all your vendor contracts and their associated amounts here.' },
      { icon: 'search', title: 'Quick search', description: 'Use the search bar to find a contract by vendor name.' },
      { icon: 'check-circle', title: 'Contract status', description: 'Every contract shows its status and full committed amount.' },
    ],
  },
  documents: {
    fr: [
      { icon: 'folder', title: 'Vos documents', description: 'Retrouvez les fichiers associés à votre mariage, vos prestataires et vos contrats.' },
      { icon: 'search', title: 'Accès rapide', description: 'Parcourez les sections ou recherchez un document pour le retrouver facilement.' },
      { icon: 'download', title: 'Ouvrir un fichier', description: 'Appuyez sur un document pour le consulter ou le télécharger.' },
    ],
    en: [
      { icon: 'folder', title: 'Your documents', description: 'Find the files associated with your wedding, vendors, and contracts.' },
      { icon: 'search', title: 'Quick access', description: 'Browse the sections or search for a document to find it quickly.' },
      { icon: 'download', title: 'Open a file', description: 'Tap a document to view or download it.' },
    ],
  },
  moodboards: {
    fr: [
      { icon: 'image', title: 'Vos moodboards', description: 'Rassemblez vos inspirations visuelles pour définir l’ambiance de chaque mariage.' },
      { icon: 'plus-circle', title: 'Ajouter une inspiration', description: 'Ajoutez des images et organisez vos idées pour les retrouver facilement.' },
    ],
    en: [
      { icon: 'image', title: 'Your moodboards', description: 'Gather visual inspiration to define the mood of each wedding.' },
      { icon: 'plus-circle', title: 'Add inspiration', description: 'Add images and organize your ideas so they are easy to find.' },
    ],
  },
  business: {
    fr: [
      { icon: 'briefcase', title: 'Votre espace Business', description: 'Suivez vos contacts professionnels, vos opportunités et vos rendez-vous.' },
      { icon: 'calendar', title: 'Organiser vos échanges', description: 'Centralisez les informations utiles pour développer votre activité de wedding planner.' },
    ],
    en: [
      { icon: 'briefcase', title: 'Your Business space', description: 'Keep track of professional contacts, opportunities, and appointments.' },
      { icon: 'calendar', title: 'Organize your conversations', description: 'Keep the information you need to grow your wedding-planning business in one place.' },
    ],
  },
  'carnet-adresse': {
    fr: [
      { icon: 'book-open', title: 'Carnet d’adresses', description: 'Conservez vos contacts professionnels et réutilisez-les dans vos mariages.' },
      { icon: 'plus-circle', title: 'Ajouter un contact', description: 'Créez une fiche contact pour garder les coordonnées et notes importantes à portée de main.' },
    ],
    en: [
      { icon: 'book-open', title: 'Address book', description: 'Keep your professional contacts and reuse them across your weddings.' },
      { icon: 'plus-circle', title: 'Add a contact', description: 'Create a contact card to keep important details and notes close at hand.' },
    ],
  },
  retroplanning: {
    fr: [
      { icon: 'clock', title: 'Votre rétroplanning', description: 'Planifiez les étapes clés à réaliser avant le jour du mariage.' },
      { icon: 'check-circle', title: 'Suivre l’avancement', description: 'Cochez les jalons terminés pour garder une vision claire des prochaines actions.' },
    ],
    en: [
      { icon: 'clock', title: 'Your timeline', description: 'Plan the key steps to complete before the wedding day.' },
      { icon: 'check-circle', title: 'Track progress', description: 'Mark milestones as complete to keep a clear view of what comes next.' },
    ],
  },
  'jour-j': {
    fr: [
      { icon: 'sun', title: 'Le Jour-J', description: 'Retrouvez les informations et le déroulé essentiels le jour de la cérémonie.' },
      { icon: 'check-circle', title: 'Rester dans le rythme', description: 'Consultez les étapes au fil de la journée et cochez ce qui est terminé.' },
    ],
    en: [
      { icon: 'sun', title: 'Wedding day', description: 'Find the essential information and schedule on the day of the ceremony.' },
      { icon: 'check-circle', title: 'Stay on track', description: 'Follow the day step by step and mark completed items as you go.' },
    ],
  },
  'mes-reseaux': {
    fr: [
      { icon: 'share-2', title: 'Mes réseaux', description: 'Suivez les performances de vos réseaux sociaux depuis votre espace de planification.' },
      { icon: 'bar-chart-2', title: 'Voir les statistiques', description: 'Comparez les indicateurs de vos comptes connectés pour mieux piloter votre visibilité.' },
    ],
    en: [
      { icon: 'share-2', title: 'My networks', description: 'Track your social-media performance from your planning space.' },
      { icon: 'bar-chart-2', title: 'View statistics', description: 'Compare metrics from connected accounts to better manage your visibility.' },
    ],
  },
  'mes-reservations': {
    fr: [
      { icon: 'clipboard', title: 'Mes réservations', description: 'Retrouvez vos réservations et les informations utiles associées à vos prestations.' },
      { icon: 'check-circle', title: 'Suivre les réservations', description: 'Consultez les statuts pour savoir ce qui est confirmé ou reste à finaliser.' },
    ],
    en: [
      { icon: 'clipboard', title: 'My bookings', description: 'Find your bookings and the useful information associated with your services.' },
      { icon: 'check-circle', title: 'Track bookings', description: 'Check statuses to see what is confirmed and what still needs attention.' },
    ],
  },
  'mes-rendez-vous': {
    fr: [
      { icon: 'clock', title: 'Mes rendez-vous', description: 'Visualisez vos prochains rendez-vous avec les couples et les prestataires.' },
      { icon: 'calendar', title: 'Préparer vos échanges', description: 'Consultez rapidement la date, l’heure et les informations de chaque rendez-vous.' },
    ],
    en: [
      { icon: 'clock', title: 'My appointments', description: 'View your upcoming appointments with couples and vendors.' },
      { icon: 'calendar', title: 'Prepare your meetings', description: 'Quickly check the date, time, and details for every appointment.' },
    ],
  },
  profil: {
    fr: [
      { icon: 'user', title: 'Votre profil', description: 'Cet écran regroupe vos informations, le mariage actif et les raccourcis principaux.' },
      { icon: 'heart', title: 'Mariage actif', description: 'Appuyez sur la carte du mariage pour consulter ou changer le mariage sélectionné.' },
      { icon: 'settings', title: 'Paramètres & aide', description: 'Gérez vos préférences et accédez au support depuis les raccourcis de l’application.' },
    ],
    en: [
      { icon: 'user', title: 'Your profile', description: 'This screen brings together your information, active wedding, and key shortcuts.' },
      { icon: 'heart', title: 'Active wedding', description: 'Tap the wedding card to view or change the selected wedding.' },
      { icon: 'settings', title: 'Settings & help', description: 'Manage your preferences and access support from the app shortcuts.' },
    ],
  },
  parametres: {
    fr: [{ icon: 'settings', title: 'Paramètres', description: 'Gérez vos préférences, vos notifications, votre langue et votre accès au support.' }],
    en: [{ icon: 'settings', title: 'Settings', description: 'Manage your preferences, notifications, language, and access to support.' }],
  },
};

export function GlobalTourHelp({ hidden = false, routeName = 'index' }: { hidden?: boolean; routeName?: string }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tourVisible, openTour, closeTour } = useTour('tour:global-help');
  const { language } = useLocalization();
  // Keep the help button close to the navigation bar and below the last
  // content row; every tab reserves a larger bottom inset for this zone.
  const bottom = (Platform.OS === 'web' ? 74 : 70) + insets.bottom + 4;

  if (hidden) return null;

  return (
    <>
      <TouchableOpacity
        onPress={openTour}
        activeOpacity={0.82}
        accessibilityRole="button"
         accessibilityLabel={language === 'en' ? 'Open help' : 'Ouvrir l’aide'}
        style={[
          fab.btn,
          {
            bottom,
            backgroundColor: colors.card,
            borderColor: colors.border,
            ...(Platform.OS === 'web'
              ? { boxShadow: '0 2px 10px rgba(93,45,93,0.18), 0 1px 4px rgba(93,45,93,0.10)' } as any
              : Platform.OS === 'ios'
                ? { shadowColor: '#3C1A3C', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.14, shadowRadius: 8 }
                : { elevation: 4 }),
          },
        ]}
      >
        <Text style={[fab.label, { fontFamily: SANS_SEMIBOLD, color: colors.plum }]}>?</Text>
      </TouchableOpacity>
       <TourSheet
         visible={tourVisible}
         onClose={closeTour}
         steps={(TAB_HELP_STEPS[routeName] ?? DEFAULT_HELP_STEPS)[language === 'en' ? 'en' : 'fr']}
       />
    </>
  );
}

const ts = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20,5,20,0.60)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    overflow: 'hidden',
    gap: 12,
  },
  goldBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: 'rgba(200,170,112,0.40)',
  },
  blob: { position: 'absolute' },
  eyebrow: {
    fontSize: 8,
    letterSpacing: 2,
    color: 'rgba(200,170,112,0.70)',
    alignSelf: 'flex-start',
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(200,170,112,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 16,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 22,
    gap: 10,
  },
  stepTitle: {
    fontSize: 26,
    lineHeight: 28,
  },
  stepDesc: {
    fontSize: 13,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  counter: {
    fontSize: 11,
  },
  navBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  backLabel: {
    fontSize: 12,
  },
  nextBtn: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  nextGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    overflow: 'hidden',
  },
  nextRim: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  nextLabel: {
    fontSize: 13,
    color: '#FBF5FB',
  },
});

const fab = StyleSheet.create({
  btn: {
    position: 'absolute',
    left: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 16,
    lineHeight: 18,
  },
});
