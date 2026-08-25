import React from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Platform, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getLocalizedPackagePrice, isNativeStorePricingAvailable, useSubscription } from '@/lib/subscription';
import { useColors } from '@/hooks/useColors';
import { SERIF, SANS, SANS_MEDIUM, SANS_SEMIBOLD } from '@/constants/fonts';
import { shadow, accentShadow } from '@/utils/shadow';
import { useLocalization } from '@/context/LocalizationContext';

function premiumFeatures(language: 'fr' | 'en') {
  const labels = language === 'fr'
    ? ['Contrats prestataires illimités', 'Analytiques budget avancées', 'Dossiers de mariage illimités', 'Pièces jointes & documents', 'Moodboards & inspirations illimitées', 'Accès prioritaire aux nouvelles fonctionnalités']
    : ['Unlimited vendor contracts', 'Advanced budget analytics', 'Unlimited wedding files', 'Attachments & documents', 'Unlimited moodboards & inspiration', 'Priority access to new features'];
  return ['file-text', 'trending-up', 'layers', 'cloud', 'star', 'zap'].map((icon, index) => ({ icon, label: labels[index]! }));
}
function annualMonthlyPrice(pkg: any, locale: string, language: 'fr' | 'en'): string | null {
  const amount = pkg?.product?.price;
  const currency = pkg?.product?.currencyCode ?? pkg?.product?.currency;
  if (typeof amount !== 'number' || !currency) return null;
  return `${new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount / 12)} / ${language === 'fr' ? 'mois' : 'month'}`;
}

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  /** Optional context label shown under the title, e.g. "Contrats prestataires" */
  featureLabel?: string;
}

export function PaywallModal({ visible, onClose, featureLabel }: PaywallModalProps) {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const subscription = useSubscription();
  const { language, locale } = useLocalization();
  const en = language === 'en';
  const openLegalDocument = (path: '/legal/privacy' | '/legal/policy') => {
    onClose();
    requestAnimationFrame(() => router.push(path));
  };

  const packages: any[] = subscription.offerings?.current?.availablePackages ?? [];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[pw.root, { backgroundColor: colors.background }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            pw.scroll,
            { paddingTop: Platform.OS === 'ios' ? insets.top + 12 : 20, paddingBottom: insets.bottom + 32 },
          ]}
        >
          {/* ── Close button ─────────────────────────────────────────────── */}
          <TouchableOpacity onPress={onClose} style={pw.closeBtn} hitSlop={{ top: 12, left: 12, bottom: 12, right: 12 }}>
            <Feather name="x" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>

          {/* ── Hero ─────────────────────────────────────────────────────── */}
          <LinearGradient
            colors={[colors.plumDark, colors.plum, colors.plumLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={pw.hero}
          >
            {/* Decorative blobs */}
            <View style={[pw.blobTR, { backgroundColor: colors.rose + '28' }]} pointerEvents="none" />
            <View style={[pw.blobBL, { backgroundColor: colors.gold + '20' }]} pointerEvents="none" />
            <LinearGradient colors={['rgba(255,255,255,0.10)', 'transparent']} style={pw.sheen} pointerEvents="none" />
            <View style={pw.goldBar} />

            {/* Crown icon */}
            <View style={[pw.crownWrap, accentShadow('md')]}>
              <LinearGradient
                colors={[colors.gold, colors.goldDim]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={pw.crownGrad}
              >
                <Feather name="award" size={28} color="#3C1A3C" />
              </LinearGradient>
            </View>

            <Text style={[pw.heroEye, { fontFamily: SANS_MEDIUM }]}>{en ? 'SUBSCRIPTION' : 'ABONNEMENT'}</Text>
            <Text style={[pw.heroTitle, { fontFamily: SERIF }]}>The Nuptial Plan Premium</Text>
            {featureLabel ? (
              <Text style={[pw.heroSub, { fontFamily: SANS }]}>
                {en ? `${featureLabel} is a Premium feature` : `${featureLabel} est une fonctionnalité Premium`}
              </Text>
            ) : (
              <Text style={[pw.heroSub, { fontFamily: SANS }]}>
                {en ? 'Everything you need to orchestrate the perfect wedding' : 'Tout ce dont vous avez besoin pour orchestrer le mariage parfait'}
              </Text>
            )}
          </LinearGradient>

          {/* Required purchase details stay above the fold, before benefits. */}
          <View style={[pw.complianceCard, shadow('sm'), { backgroundColor: colors.card, borderColor: colors.border }]}>
            {packages.map((pkg: any) => {
              const annual = pkg.packageType === 'ANNUAL';
              return (
                <TouchableOpacity key={`summary-${pkg.identifier}`} onPress={() => void subscription.purchase(pkg)} disabled={subscription.loading} style={[pw.summaryPlan, { borderColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[pw.summaryTitle, { fontFamily: SANS_SEMIBOLD, color: colors.foreground }]}>The Nuptial Plan Premium</Text>
                    <Text style={[pw.summaryDetail, { fontFamily: SANS, color: colors.mutedForeground }]}>
                       {annual ? (en ? 'Annual subscription · 12 months' : 'Abonnement annuel · 12 mois') : (en ? 'Monthly subscription · 1 month' : 'Abonnement mensuel · 1 mois')}
                    </Text>
                     <Text style={[pw.summaryPrice, { fontFamily: SERIF, color: colors.plum }]}>{getLocalizedPackagePrice(pkg) ?? (en ? 'Price set by your store' : 'Prix selon votre boutique')}</Text>
                     {annual && annualMonthlyPrice(pkg, locale, language) && <Text style={[pw.summaryDetail, { fontFamily: SANS, color: colors.mutedForeground }]}>{annualMonthlyPrice(pkg, locale, language)}</Text>}
                  </View>
                   <Text style={[pw.chooseText, { fontFamily: SANS_SEMIBOLD, color: colors.plum }]}>{en ? 'Choose' : 'Choisir'}</Text>
                </TouchableOpacity>
              );
            })}
            <View style={pw.complianceActions}>
              <TouchableOpacity onPress={() => void subscription.restore()} disabled={subscription.loading} style={pw.restoreBtn}>
                <Text style={[pw.restoreText, { fontFamily: SANS_MEDIUM, color: colors.plum }]}>{en ? 'Restore purchases' : 'Restaurer les achats'}</Text>
              </TouchableOpacity>
              <View style={pw.legalLinks}>
                <Text onPress={() => openLegalDocument('/legal/privacy')} style={[pw.legalLink, { fontFamily: SANS_MEDIUM, color: colors.plum }]}>{en ? 'Privacy policy' : 'Politique de confidentialité'}</Text>
                <Text style={[pw.legalSeparator, { color: colors.mutedForeground }]}>·</Text>
                <Text onPress={() => openLegalDocument('/legal/policy')} style={[pw.legalLink, { fontFamily: SANS_MEDIUM, color: colors.plum }]}>{en ? 'Terms of use' : 'Conditions d’utilisation'}</Text>
              </View>
            </View>
          </View>

          {/* ── Feature list ─────────────────────────────────────────────── */}
          <View style={[pw.featuresCard, shadow('sm'), { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[pw.rim, { borderTopColor: 'rgba(255,255,255,0.70)' }]} />
            <Text style={[pw.featuresTitle, { fontFamily: SANS_SEMIBOLD, color: colors.mutedForeground }]}>
               {en ? 'INCLUDED WITH PREMIUM' : 'INCLUS AVEC PREMIUM'}
            </Text>
             {premiumFeatures(language).map((f) => (
              <View key={f.icon} style={pw.featureRow}>
                <View style={[pw.featureIcon, { backgroundColor: colors.goldLight }]}>
                  <Feather name={f.icon as any} size={14} color={colors.goldDim} />
                </View>
                <Text style={[pw.featureLabel, { fontFamily: SANS, color: colors.foreground }]}>{f.label}</Text>
                <Feather name="check" size={14} color={colors.sage} />
              </View>
            ))}
          </View>

          {/* ── Trial badge ──────────────────────────────────────────────── */}
          <View style={[pw.trialBadge, { backgroundColor: colors.sageBg, borderColor: colors.sage + '44' }]}>
            <Feather name="gift" size={14} color={colors.sageDark} />
            <Text style={[pw.trialText, { fontFamily: SANS_SEMIBOLD, color: colors.sageDark }]}>
               {en ? 'One-month free trial included' : 'Essai gratuit d’un mois inclus'}
            </Text>
          </View>

          {/* ── Package options ───────────────────────────────────────────── */}
          {packages.length > 0 ? (
            <View style={pw.packagesWrap}>
              {packages
                .slice()
                .sort((a: any, b: any) => {
                  // Show ANNUAL first
                  if (a.packageType === 'ANNUAL') return -1;
                  if (b.packageType === 'ANNUAL') return 1;
                  return 0;
                })
                .map((pkg: any) => {
                  const isAnnual = pkg.packageType === 'ANNUAL';
                  return (
                    <TouchableOpacity
                      key={pkg.identifier}
                      disabled={subscription.loading}
                      onPress={() => void subscription.purchase(pkg)}
                      activeOpacity={0.82}
                      style={[
                        pw.packageCard,
                        shadow(isAnnual ? 'md' : 'sm'),
                        { borderColor: isAnnual ? colors.gold : colors.border },
                        isAnnual && { backgroundColor: colors.plumBg },
                        !isAnnual && { backgroundColor: colors.card },
                      ]}
                    >
                      {isAnnual && (
                        <View style={[pw.popularPill, { backgroundColor: colors.gold }]}>
                           <Text style={[pw.popularText, { fontFamily: SANS_SEMIBOLD }]}>{en ? 'POPULAR' : 'POPULAIRE'}</Text>
                        </View>
                      )}
                      <View style={pw.packageLeft}>
                        <Text style={[pw.packageName, { fontFamily: SANS_SEMIBOLD, color: colors.foreground }]}>
                           {isAnnual ? (en ? 'Annual' : 'Annuel') : (en ? 'Monthly' : 'Mensuel')}
                        </Text>
                        <Text style={[pw.packagePrice, { fontFamily: SERIF, color: isAnnual ? colors.plum : colors.foreground }]}>
                           {getLocalizedPackagePrice(pkg) ?? (en ? 'Price set by your store' : 'Prix selon votre boutique')}
                        </Text>
                        {isAnnual && (
                          <Text style={[pw.packageNote, { fontFamily: SANS, color: colors.mutedForeground }]}>
                             {en ? 'Save compared with monthly' : 'Économisez par rapport au mensuel'}
                          </Text>
                        )}
                      </View>
                      <View style={[
                        pw.packageCta,
                        { backgroundColor: isAnnual ? colors.plum : colors.muted },
                      ]}>
                        {subscription.loading ? (
                          <ActivityIndicator size="small" color={isAnnual ? '#FBF5FB' : colors.plum} />
                        ) : (
                          <Text style={[pw.packageCtaText, { fontFamily: SANS_SEMIBOLD, color: isAnnual ? '#FBF5FB' : colors.plum }]}>
                             {en ? 'Choose' : 'Choisir'}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
            </View>
          ) : (
            /* Fallback when RevenueCat isn't configured yet */
            <View style={[pw.unavailableCard, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Feather name="info" size={15} color={colors.mutedForeground} />
              <Text style={[pw.unavailableText, { fontFamily: SANS, color: colors.mutedForeground }]}>
                 {en ? 'Purchases will be available after App Store and Google Play configuration.' : 'Les achats seront disponibles après la configuration App Store et Google Play.'}
              </Text>
            </View>
          )}

          {!isNativeStorePricingAvailable && packages.length > 0 && (
            <Text style={[pw.storePricingNote, { fontFamily: SANS, color: colors.mutedForeground }]}>
               {en ? 'The final price will be shown in your App Store currency in the native iOS version.' : 'Le prix final sera affiché selon la devise de votre App Store dans la version iOS native.'}
            </Text>
          )}

          <Text style={[pw.legalText, { fontFamily: SANS, color: colors.mutedForeground }]}>
             {en ? 'The subscription renews automatically. Cancel anytime in your device settings.' : 'L’abonnement est renouvelé automatiquement. Résiliable à tout moment depuis les réglages de votre appareil.'}
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const pw = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16 },

  closeBtn: {
    alignSelf: 'flex-end',
    marginBottom: 8,
    padding: 6,
    borderRadius: 20,
  },

  /* Hero */
  hero: {
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 32,
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 14,
  },
  blobTR: { position: 'absolute', top: -24, right: -24, width: 120, height: 120, borderRadius: 60 },
  blobBL: { position: 'absolute', bottom: -16, left: -16, width: 90, height: 90, borderRadius: 45 },
  sheen: { ...StyleSheet.absoluteFillObject, height: 90 },
  goldBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 1.5, backgroundColor: 'rgba(200,170,112,0.35)' },
  crownWrap: { marginBottom: 14 },
  crownGrad: { width: 68, height: 68, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  heroEye: { fontSize: 9, letterSpacing: 2, color: '#C8A96E', marginBottom: 6 },
  heroTitle: { fontSize: 30, color: '#FBF5FB', lineHeight: 34, marginBottom: 6, textAlign: 'center' },
  heroSub: { fontSize: 12, color: '#DEC0DE', textAlign: 'center', lineHeight: 17, paddingHorizontal: 10 },

  /* Features card */
  featuresCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingBottom: 14,
    marginBottom: 12,
  },
  rim: { position: 'absolute', left: 0, right: 0, top: 0, height: 1, borderTopWidth: 1 },
  featuresTitle: { fontSize: 9, letterSpacing: 1.4, marginTop: 14, marginBottom: 10 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  featureIcon: { width: 28, height: 28, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  featureLabel: { flex: 1, fontSize: 13, lineHeight: 18 },

  /* Trial badge */
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
  },
  trialText: { fontSize: 12 },

  /* Package cards */
  packagesWrap: { gap: 10, marginBottom: 16 },
  packageCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    overflow: 'visible',
    position: 'relative',
  },
  popularPill: {
    position: 'absolute',
    top: -9,
    right: 12,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  popularText: { fontSize: 8, letterSpacing: 1, color: '#3C1A3C' },
  packageLeft: { flex: 1 },
  packageName: { fontSize: 13, marginBottom: 2 },
  packagePrice: { fontSize: 22, lineHeight: 24, marginBottom: 2 },
  packageNote: { fontSize: 11 },
  packageCta: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 9,
    minWidth: 72,
    alignItems: 'center',
  },
  packageCtaText: { fontSize: 13 },
  complianceCard: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', marginBottom: 12 },
  summaryPlan: { flexDirection: 'row', gap: 10, padding: 13, borderBottomWidth: StyleSheet.hairlineWidth },
  summaryTitle: { fontSize: 12 },
  summaryDetail: { fontSize: 10, marginTop: 2 },
  summaryPrice: { fontSize: 19, marginTop: 4 },
  chooseText: { alignSelf: 'center', fontSize: 11 },
  complianceActions: { padding: 11, gap: 8 },

  /* Unavailable fallback */
  unavailableCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 16,
  },
  unavailableText: { flex: 1, fontSize: 12, lineHeight: 17 },

  /* Restore */
  restoreBtn: { alignItems: 'center', paddingVertical: 4 },
  restoreText: { fontSize: 12 },
  legalLinks: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, flexWrap: 'wrap' },
  legalLink: { fontSize: 10, textDecorationLine: 'underline' },
  legalSeparator: { fontSize: 10 },

  /* Legal */
  legalText: { fontSize: 10, lineHeight: 14, textAlign: 'center', paddingHorizontal: 8, marginTop: 4, opacity: 0.75 },
  storePricingNote: { fontSize: 10, lineHeight: 14, textAlign: 'center', paddingHorizontal: 16, marginTop: 2 },
});
