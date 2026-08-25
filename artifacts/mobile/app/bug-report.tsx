import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Linking, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SERIF, SANS, SANS_MEDIUM, SANS_SEMIBOLD } from '@/constants/fonts';
import { useColors } from '@/hooks/useColors';
import { shadow, accentShadow } from '@/utils/shadow';
import { useLocalization } from '@/context/LocalizationContext';

const DESTINATION = 'contact@thenuptialplan.com';

export default function BugReportScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLocalization();
  const withEmail = (key: 'bug.emailUnavailableMessage' | 'bug.openEmailFailedMessage') =>
    t(key).replace('{email}', DESTINATION);
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState('');
  const [contact, setContact] = useState('');
  const [sending, setSending] = useState(false);
  const device = useMemo(() => `${Platform.OS} · version ${String(Platform.Version)}`, []);

  const sendReport = async () => {
    if (!description.trim()) {
      Alert.alert(t('bug.descriptionRequired'), t('bug.descriptionRequiredMessage'));
      return;
    }
    setSending(true);
    const body = [
       t('bug.hello'),
      '',
       t('bug.reportIntro'),
      '',
       t('bug.issueDescription'),
      description.trim(),
      '',
       t('bug.steps'),
       steps.trim() || t('bug.notProvided'),
      '',
       `${t('bug.deviceVersion')}: ${device}`,
       contact.trim() ? `${t('bug.contactEmail')}: ${contact.trim()}` : '',
      '',
       t('bug.thanks'),
    ].filter(Boolean).join('\n');
    const url = `mailto:${DESTINATION}?subject=${encodeURIComponent(t('bug.subject'))}&body=${encodeURIComponent(body)}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert(t('bug.emailUnavailable'), withEmail('bug.emailUnavailableMessage'));
      } else {
        await Linking.openURL(url);
      }
    } catch {
      Alert.alert(t('bug.openEmailFailed'), withEmail('bug.openEmailFailedMessage'));
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={[ss.root, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[ss.scroll, { paddingTop: insets.top, paddingBottom: 160 + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient colors={[colors.plumDark, colors.plum, colors.plumLight]} style={ss.hero}>
            <View style={[ss.heroOrb, { backgroundColor: colors.rose + '20' }]} pointerEvents="none" />
            <View style={[ss.heroGlow, { backgroundColor: colors.gold + '18' }]} pointerEvents="none" />
            <LinearGradient colors={['rgba(255,255,255,0.08)', 'transparent']} style={ss.heroSheen} pointerEvents="none" />
            <View style={ss.goldBar} />
            <TouchableOpacity onPress={() => router.back()} style={ss.backButton} accessibilityLabel={t('bug.backSettings')}>
              <Feather name="arrow-left" size={17} color="#FBF5FB" />
              <Text style={[ss.backText, { fontFamily: SANS_MEDIUM }]}>{t('bug.backSettings')}</Text>
            </TouchableOpacity>
            <View style={[ss.iconCircle, accentShadow('md')]}>
              <LinearGradient colors={[colors.gold, colors.goldDim]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={ss.iconGradient}>
                <Feather name="alert-circle" size={25} color={colors.plumDark} />
              </LinearGradient>
            </View>
            <Text style={[ss.eyebrow, { color: colors.gold, fontFamily: SANS_MEDIUM }]}>{t('bug.support')}</Text>
            <Text style={[ss.title, { color: '#FBF5FB', fontFamily: SERIF }]}>{t('bug.title')}</Text>
            <Text style={[ss.subtitle, { color: '#F7EAF4', fontFamily: SANS }]}>{t('bug.subtitle')}</Text>
          </LinearGradient>

          <View style={ss.content}>
            <View style={[ss.formCard, shadow('sm'), { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[ss.infoCard, { backgroundColor: colors.goldLight, borderColor: colors.gold + '45' }]}>
              <Feather name="mail" size={15} color={colors.goldDim} />
              <Text style={[ss.infoText, { color: colors.foreground, fontFamily: SANS }]}>{t('bug.info')}<Text style={{ color: colors.foreground, fontFamily: SANS_SEMIBOLD }}>{DESTINATION}</Text>.</Text>
            </View>

             <Text style={[ss.label, { color: colors.goldDim, fontFamily: SANS_SEMIBOLD }]}>{t('bug.issueLabel')}</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
               placeholder={t('bug.issuePlaceholder')}
              placeholderTextColor={colors.mutedForeground + 'AA'}
              multiline
              textAlignVertical="top"
              style={[ss.textArea, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border, fontFamily: SANS }]}
            />

             <Text style={[ss.label, { color: colors.goldDim, fontFamily: SANS_SEMIBOLD }]}>{t('bug.stepsLabel')}</Text>
            <TextInput
              value={steps}
              onChangeText={setSteps}
               placeholder={t('bug.stepsPlaceholder')}
              placeholderTextColor={colors.mutedForeground + 'AA'}
              multiline
              textAlignVertical="top"
              style={[ss.textArea, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border, fontFamily: SANS }]}
            />

             <Text style={[ss.label, { color: colors.goldDim, fontFamily: SANS_SEMIBOLD }]}>{t('bug.emailLabel')}</Text>
            <TextInput
              value={contact}
              onChangeText={setContact}
               placeholder={t('bug.emailPlaceholder')}
              placeholderTextColor={colors.mutedForeground + 'AA'}
              autoCapitalize="none"
              keyboardType="email-address"
              style={[ss.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border, fontFamily: SANS }]}
            />

            <View style={[ss.deviceRow, { borderColor: colors.border }]}>
              <Feather name="smartphone" size={14} color={colors.mutedForeground} />
                <Text style={[ss.deviceText, { color: colors.mutedForeground, fontFamily: SANS }]}>{t('bug.technicalInfo')} {device}</Text>
            </View>

            <TouchableOpacity
              onPress={sendReport}
              disabled={sending}
              activeOpacity={0.82}
              style={[ss.submit, accentShadow('md'), { backgroundColor: colors.plum, opacity: sending ? 0.65 : 1 }]}
            >
               {sending ? <ActivityIndicator color="#FBF5FB" /> : <><Feather name="send" size={16} color="#FBF5FB" /><Text style={[ss.submitText, { fontFamily: SANS_SEMIBOLD }]}>{t('bug.prepareEmail')}</Text></>}
            </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const ss = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingBottom: 160 },
  hero: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 27, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' },
  heroOrb: { position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: 60 },
  heroGlow: { position: 'absolute', bottom: -10, left: -20, width: 90, height: 90, borderRadius: 45 },
  heroSheen: { ...StyleSheet.absoluteFillObject },
  goldBar: { position: 'absolute', left: 22, top: 0, width: 52, height: 3, backgroundColor: '#C8A96E' },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', paddingVertical: 8, paddingRight: 10, marginBottom: 18 },
  backText: { color: '#FBF5FB', fontSize: 11 },
  iconCircle: { width: 58, height: 58, borderRadius: 18, overflow: 'hidden', marginBottom: 15 },
  iconGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 9, letterSpacing: 1.8, marginBottom: 8 },
  title: { fontSize: 38, lineHeight: 40 },
  subtitle: { fontSize: 12, lineHeight: 19, marginTop: 13 },
  content: { paddingHorizontal: 16, paddingTop: 18 },
  formCard: { borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, padding: 16 },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 13, borderRadius: 13, borderWidth: 1, marginBottom: 21 },
  infoText: { flex: 1, fontSize: 11, lineHeight: 17 },
  label: { fontSize: 9, letterSpacing: 1.2, marginBottom: 7, marginTop: 14 },
  input: { height: 48, borderRadius: 11, borderWidth: 1, paddingHorizontal: 13, fontSize: 13 },
  textArea: { minHeight: 116, borderRadius: 11, borderWidth: 1, paddingHorizontal: 13, paddingTop: 12, fontSize: 13, lineHeight: 19 },
  deviceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 22, paddingTop: 14 },
  deviceText: { fontSize: 10 },
  submit: { minHeight: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 23 },
  submitText: { color: '#FBF5FB', fontSize: 13 },
});