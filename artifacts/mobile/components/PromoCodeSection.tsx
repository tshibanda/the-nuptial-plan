import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, AppState, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { sanitizeOfferCode, useSubscription } from '@/lib/subscription';
import { useColors } from '@/hooks/useColors';
import { SANS, SANS_MEDIUM, SANS_SEMIBOLD, SERIF } from '@/constants/fonts';
import { useLocalization } from '@/context/LocalizationContext';

/**
 * Saisie d'un Offer Code Apple dans le paywall (iOS uniquement).
 *
 * Le code tapé ici préremplit l'écran de l'App Store : Apple y affiche l'offre
 * et l'utilisateur confirme. RevenueCat reçoit la transaction, le contexte
 * d'abonnement synchronise le serveur, puis `onRedeemed` est appelé.
 */

type Status = 'closed' | 'editing' | 'pending' | 'checking' | 'notFound' | 'error' | 'success';

interface PromoCodeSectionProps {
  /** Appelé une fois Premium actif (ex. fermer le paywall). */
  onRedeemed?: () => void;
}

export function PromoCodeSection({ onRedeemed }: PromoCodeSectionProps) {
  const colors = useColors();
  const subscription = useSubscription();
  const { language } = useLocalization();
  const en = language === 'en';

  const [status, setStatus] = useState<Status>('closed');
  const [code, setCode] = useState('');
  const pending = useRef(false);

  const clean = sanitizeOfferCode(code);
  const busy = status === 'pending' || status === 'checking';

  // Premium activé par le listener RevenueCat pendant l'attente
  useEffect(() => {
    if (!pending.current || !subscription.isActive) return;
    pending.current = false;
    setStatus('success');
  }, [subscription.isActive]);

  // Laisse le message de confirmation visible un instant, puis ferme le paywall
  useEffect(() => {
    if (status !== 'success') return;
    const timer = setTimeout(() => onRedeemed?.(), 1200);
    return () => clearTimeout(timer);
  }, [status, onRedeemed]);

  const { refresh } = subscription;

  const check = useCallback(async () => {
    setStatus('checking');
    try {
      const active = await refresh();
      if (active) {
        pending.current = false;
        setStatus('success');
      } else {
        // On reste à l'écoute : la transaction peut arriver quelques secondes plus tard
        setStatus('notFound');
      }
    } catch {
      setStatus('error');
    }
  }, [refresh]);

  // Retour dans l'app après l'écran de l'App Store
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && pending.current) void check();
    });
    return () => sub.remove();
  }, [check]);

  if (!subscription.canRedeemOfferCodes || (subscription.isActive && status !== 'success')) {
    return null;
  }

  const applyCode = async () => {
    if (!clean || busy) return;
    pending.current = true;
    setStatus('pending');
    try {
      await subscription.redeemOfferCode(clean);
    } catch {
      pending.current = false;
      setStatus('error');
    }
  };

  const openAppleSheet = async () => {
    pending.current = true;
    setStatus('pending');
    try {
      await subscription.presentRedeemSheet();
    } catch {
      pending.current = false;
      setStatus('error');
    }
  };

  if (status === 'closed') {
    return (
      <TouchableOpacity
        onPress={() => setStatus('editing')}
        disabled={subscription.loading}
        style={s.trigger}
        accessibilityRole="button"
      >
        <Text style={[s.triggerText, { fontFamily: SANS_MEDIUM, color: colors.plum }]}>
          {en ? 'I have a promo code' : 'J’ai un code promo'}
        </Text>
      </TouchableOpacity>
    );
  }

  if (status === 'success') {
    return (
      <View style={[s.panel, { borderColor: colors.sage + '55', backgroundColor: colors.sageBg }]}>
        <View style={s.successRow}>
          <Feather name="check-circle" size={16} color={colors.sageDark} />
          <Text style={[s.successTitle, { fontFamily: SANS_SEMIBOLD, color: colors.foreground }]}>
            {en ? 'Code applied' : 'Code appliqué'}
          </Text>
        </View>
        <Text style={[s.help, { fontFamily: SANS, color: colors.mutedForeground }]}>
          {en ? 'Your Premium subscription is active with the offer.' : 'Votre abonnement Premium est actif avec l’offre.'}
        </Text>
      </View>
    );
  }

  const message = (() => {
    switch (status) {
      case 'pending':
        return en
          ? 'Confirm the offer on the App Store screen, then come back here.'
          : 'Confirmez l’offre sur l’écran de l’App Store, puis revenez ici.';
      case 'notFound':
        return en
          ? 'No subscription activated yet. If you confirmed the offer, check your access in a few seconds.'
          : 'Aucun abonnement activé pour l’instant. Si vous avez confirmé l’offre, vérifiez votre accès dans quelques secondes.';
      case 'error':
        return en
          ? 'The App Store could not be opened. Check your connection and try again.'
          : 'Impossible d’ouvrir l’App Store. Vérifiez votre connexion et réessayez.';
      default:
        return en
          ? 'The discount is shown and confirmed on the App Store before any payment.'
          : 'La réduction est affichée et confirmée sur l’App Store avant tout paiement.';
    }
  })();

  return (
    <View style={[s.panel, { borderColor: colors.border, backgroundColor: colors.background }]}>
      <Text style={[s.title, { fontFamily: SERIF, color: colors.foreground }]}>
        {en ? 'Promo code' : 'Code promo'}
      </Text>

      <TextInput
        value={code}
        onChangeText={(text) => {
          setCode(text);
          if (status === 'error' || status === 'notFound') setStatus('editing');
        }}
        placeholder={en ? 'Enter your code' : 'Saisissez votre code'}
        placeholderTextColor={colors.mutedForeground}
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
        spellCheck={false}
        returnKeyType="done"
        onSubmitEditing={() => void applyCode()}
        editable={!busy}
        accessibilityLabel={en ? 'Promo code' : 'Code promo'}
        style={[s.input, { fontFamily: SANS_MEDIUM, color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
      />

      <TouchableOpacity
        onPress={() => void applyCode()}
        disabled={!clean || busy}
        activeOpacity={0.82}
        accessibilityRole="button"
        style={[s.button, { backgroundColor: colors.plum, opacity: !clean || busy ? 0.45 : 1 }]}
      >
        {busy ? (
          <ActivityIndicator size="small" color="#FBF5FB" />
        ) : (
          <Text style={[s.buttonText, { fontFamily: SANS_SEMIBOLD }]}>
            {en ? 'Apply code' : 'Appliquer le code'}
          </Text>
        )}
      </TouchableOpacity>

      <Text style={[s.help, { fontFamily: SANS, color: status === 'error' ? colors.destructive : colors.mutedForeground }]}>
        {message}
      </Text>

      <View style={s.secondaryRow}>
        {(status === 'pending' || status === 'notFound') && (
          <TouchableOpacity onPress={() => void check()} disabled={busy} accessibilityRole="button">
            <Text style={[s.secondaryLink, { fontFamily: SANS_MEDIUM, color: colors.plum }]}>
              {en ? 'Check my access' : 'Vérifier mon accès'}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => void openAppleSheet()} disabled={busy} accessibilityRole="button">
          <Text style={[s.secondaryLink, { fontFamily: SANS, color: colors.mutedForeground }]}>
            {en ? 'Enter the code in the App Store' : 'Saisir le code dans l’App Store'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  trigger: { alignItems: 'center', paddingVertical: 4 },
  triggerText: { fontSize: 12, textDecorationLine: 'underline' },

  panel: { borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, padding: 13, gap: 10 },
  title: { fontSize: 20, lineHeight: 22 },
  input: {
    fontSize: 15,
    letterSpacing: 1.2,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 9,
    paddingHorizontal: 13,
    paddingVertical: 12,
  },
  button: { minHeight: 44, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 13, color: '#FBF5FB' },
  help: { fontSize: 11, lineHeight: 16 },
  secondaryRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 14 },
  secondaryLink: { fontSize: 11, textDecorationLine: 'underline' },

  successRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  successTitle: { fontSize: 13 },
});
