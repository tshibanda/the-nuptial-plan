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
          <Text style={[ts.eyebrow, { fontFamily: SANS_SEMIBOLD }]}>GUIDE DE L'ÉCRAN</Text>

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
                  Retour
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
                  {isLast ? 'Commencer' : 'Suivant'}
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

const GLOBAL_HELP_STEPS = [
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
];

export function GlobalTourHelp() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tourVisible, openTour, closeTour } = useTour('tour:global-help');
  const bottom = (Platform.OS === 'web' ? 74 : 64) + insets.bottom + 14;

  return (
    <>
      <TouchableOpacity
        onPress={openTour}
        activeOpacity={0.82}
        accessibilityRole="button"
        accessibilityLabel="Ouvrir l’aide"
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
      <TourSheet visible={tourVisible} onClose={closeTour} steps={GLOBAL_HELP_STEPS} />
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
