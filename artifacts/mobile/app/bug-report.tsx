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

const DESTINATION = 'contact@thenuptialplan.com';

export default function BugReportScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState('');
  const [contact, setContact] = useState('');
  const [sending, setSending] = useState(false);
  const device = useMemo(() => `${Platform.OS} · version ${String(Platform.Version)}`, []);

  const sendReport = async () => {
    if (!description.trim()) {
      Alert.alert('Description requise', 'Décrivez le problème rencontré avant d’envoyer votre rapport.');
      return;
    }
    setSending(true);
    const body = [
      'Bonjour,',
      '',
      'Je souhaite signaler un bug dans The Nuptial Plan.',
      '',
      'Description du problème :',
      description.trim(),
      '',
      'Étapes pour reproduire :',
      steps.trim() || 'Non renseignées',
      '',
      `Appareil / version : ${device}`,
      contact.trim() ? `Adresse de contact : ${contact.trim()}` : '',
      '',
      'Merci.',
    ].filter(Boolean).join('\n');
    const url = `mailto:${DESTINATION}?subject=${encodeURIComponent('Rapport de bug — The Nuptial Plan')}&body=${encodeURIComponent(body)}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert('E-mail indisponible', `Aucune application e-mail n’est configurée sur cet appareil. Vous pouvez écrire à ${DESTINATION}.`);
      } else {
        await Linking.openURL(url);
      }
    } catch {
      Alert.alert('Impossible d’ouvrir l’e-mail', `Veuillez envoyer votre rapport à ${DESTINATION}.`);
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={[ss.root, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[ss.scroll, { paddingTop: insets.top }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient colors={[colors.plumDark, colors.plum, colors.plumLight]} style={ss.hero}>
            <TouchableOpacity onPress={() => router.back()} style={ss.backButton} accessibilityLabel="Retour">
              <Feather name="arrow-left" size={17} color="#FBF5FB" />
              <Text style={[ss.backText, { fontFamily: SANS_MEDIUM }]}>Retour aux paramètres</Text>
            </TouchableOpacity>
            <View style={ss.iconCircle}><Feather name="alert-circle" size={26} color={colors.gold} /></View>
            <Text style={[ss.eyebrow, { color: colors.gold, fontFamily: SANS_MEDIUM }]}>AIDE & SUPPORT</Text>
            <Text style={[ss.title, { color: '#FBF5FB', fontFamily: SERIF }]}>Signaler un bug</Text>
            <Text style={[ss.subtitle, { color: '#F7EAF4', fontFamily: SANS }]}>Aidez-nous à améliorer votre expérience. Décrivez ce qui s’est passé et nous vous répondrons dès que possible.</Text>
          </LinearGradient>

          <View style={ss.content}>
            <View style={[ss.infoCard, { backgroundColor: colors.goldLight, borderColor: colors.gold + '45' }]}>
              <Feather name="mail" size={15} color={colors.goldDim} />
              <Text style={[ss.infoText, { color: colors.plum, fontFamily: SANS }]}>Votre rapport sera préparé dans un e-mail adressé à <Text style={{ fontFamily: SANS_SEMIBOLD }}>{DESTINATION}</Text>.</Text>
            </View>

            <Text style={[ss.label, { color: colors.mutedForeground, fontFamily: SANS_SEMIBOLD }]}>DESCRIPTION DU PROBLÈME *</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Que s’est-il passé ?"
              placeholderTextColor={colors.mutedForeground + 'AA'}
              multiline
              textAlignVertical="top"
              style={[ss.textArea, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border, fontFamily: SANS }]}
            />

            <Text style={[ss.label, { color: colors.mutedForeground, fontFamily: SANS_SEMIBOLD }]}>ÉTAPES POUR REPRODUIRE</Text>
            <TextInput
              value={steps}
              onChangeText={setSteps}
              placeholder="1. Ouvrir…&#10;2. Appuyer sur…&#10;3. Observer…"
              placeholderTextColor={colors.mutedForeground + 'AA'}
              multiline
              textAlignVertical="top"
              style={[ss.textArea, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border, fontFamily: SANS }]}
            />

            <Text style={[ss.label, { color: colors.mutedForeground, fontFamily: SANS_SEMIBOLD }]}>VOTRE E-MAIL (FACULTATIF)</Text>
            <TextInput
              value={contact}
              onChangeText={setContact}
              placeholder="Pour recevoir une réponse"
              placeholderTextColor={colors.mutedForeground + 'AA'}
              autoCapitalize="none"
              keyboardType="email-address"
              style={[ss.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border, fontFamily: SANS }]}
            />

            <View style={[ss.deviceRow, { borderColor: colors.border }]}>
              <Feather name="smartphone" size={14} color={colors.mutedForeground} />
              <Text style={[ss.deviceText, { color: colors.mutedForeground, fontFamily: SANS }]}>Informations techniques jointes : {device}</Text>
            </View>

            <TouchableOpacity
              onPress={sendReport}
              disabled={sending}
              activeOpacity={0.82}
              style={[ss.submit, { backgroundColor: colors.plum, opacity: sending ? 0.65 : 1 }]}
            >
              {sending ? <ActivityIndicator color="#FBF5FB" /> : <><Feather name="send" size={16} color="#FBF5FB" /><Text style={[ss.submitText, { fontFamily: SANS_SEMIBOLD }]}>Préparer l’e-mail</Text></>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const ss = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingBottom: 40 },
  hero: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 27, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', paddingVertical: 8, paddingRight: 10, marginBottom: 18 },
  backText: { color: '#FBF5FB', fontSize: 11 },
  iconCircle: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(200,169,110,0.16)', borderWidth: 1, borderColor: 'rgba(200,169,110,0.35)', marginBottom: 15 },
  eyebrow: { fontSize: 9, letterSpacing: 1.8, marginBottom: 8 },
  title: { fontSize: 38, lineHeight: 40 },
  subtitle: { fontSize: 12, lineHeight: 19, marginTop: 13 },
  content: { paddingHorizontal: 16, paddingTop: 18 },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 13, borderRadius: 13, borderWidth: 1, marginBottom: 21 },
  infoText: { flex: 1, fontSize: 11, lineHeight: 17 },
  label: { fontSize: 9, letterSpacing: 1.2, marginBottom: 7, marginTop: 14 },
  input: { height: 48, borderRadius: 11, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 13, fontSize: 13 },
  textArea: { minHeight: 116, borderRadius: 11, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 13, paddingTop: 12, fontSize: 13, lineHeight: 19 },
  deviceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 22, paddingTop: 14 },
  deviceText: { fontSize: 10 },
  submit: { minHeight: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 23 },
  submitText: { color: '#FBF5FB', fontSize: 13 },
});