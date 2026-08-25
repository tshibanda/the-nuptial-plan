import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PaywallModal } from '@/components/PaywallModal';
import { usePremiumGate } from '@/hooks/usePremiumGate';
import { useColors } from '@/hooks/useColors';
import { SANS, SANS_SEMIBOLD, SERIF } from '@/constants/fonts';
import { useLocalization } from '@/context/LocalizationContext';

export function PremiumPageGate({ featureLabel }: { featureLabel: string }) {
  const colors = useColors();
  const { paywallVisible, closePaywall, openPaywall } = usePremiumGate();
  const { language } = useLocalization();
  const en = language === 'en';

  return (
    <>
      <PaywallModal visible={paywallVisible} onClose={closePaywall} featureLabel={featureLabel} />
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <LinearGradient colors={[colors.plumDark, colors.plum, colors.plumLight]} style={styles.hero}>
          <Feather name="lock" size={24} color={colors.gold} />
          <Text style={[styles.eyebrow, { color: colors.gold, fontFamily: SANS_SEMIBOLD }]}>{en ? 'PREMIUM FEATURE' : 'FONCTIONNALITÉ PREMIUM'}</Text>
          <Text style={[styles.title, { color: '#FBF5FB', fontFamily: SERIF }]}>{en ? `Unlock ${featureLabel}` : `Débloquez ${featureLabel}`}</Text>
          <Text style={[styles.body, { color: '#F7EAF4', fontFamily: SANS }]}>
            {en ? 'Subscribe to Premium to access this tab and all its features.' : 'Abonnez-vous à Premium pour accéder à cet onglet et utiliser toutes ses fonctionnalités.'}
          </Text>
          <TouchableOpacity onPress={openPaywall} style={styles.button} activeOpacity={0.82}>
            <Feather name="award" size={15} color="#3C1A3C" />
            <Text style={[styles.buttonText, { fontFamily: SANS_SEMIBOLD }]}>{en ? 'Go Premium' : 'Passer à Premium'}</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 18, paddingTop: 42 },
  hero: { borderRadius: 22, padding: 24, overflow: 'hidden' },
  eyebrow: { fontSize: 9, letterSpacing: 1.5, marginTop: 18 },
  title: { fontSize: 31, lineHeight: 35, marginTop: 8 },
  body: { fontSize: 13, lineHeight: 20, marginTop: 12, maxWidth: 500 },
  button: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 22, minHeight: 44, paddingHorizontal: 16, borderRadius: 10, backgroundColor: '#E2B93B' },
  buttonText: { color: '#3C1A3C', fontSize: 11, letterSpacing: 0.2 },
});