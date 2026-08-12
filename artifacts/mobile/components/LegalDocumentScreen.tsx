import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LEGAL_DOCUMENTS, LegalDocumentKey } from '@/constants/legal-content';
import { useColors } from '@/hooks/useColors';
import { SERIF, SANS, SANS_MEDIUM, SANS_SEMIBOLD } from '@/constants/fonts';

export function LegalDocumentScreen({ document }: { document: LegalDocumentKey }) {
  const colors = useColors();
  const router = useRouter();
  const content = LEGAL_DOCUMENTS[document];

  return (
    <View style={[ss.root, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={ss.scroll}>
        <LinearGradient colors={[colors.plumDark, colors.plum, colors.plumLight]} style={ss.hero}>
          <TouchableOpacity onPress={() => router.back()} style={ss.backButton} accessibilityLabel="Retour">
            <Feather name="arrow-left" size={17} color="#FBF5FB" />
            <Text style={[ss.backText, { fontFamily: SANS_MEDIUM }]}>Retour</Text>
          </TouchableOpacity>
          <View style={ss.heroIcon}><Feather name={content.icon} size={25} color={colors.gold} /></View>
          <Text style={[ss.eyebrow, { color: colors.gold, fontFamily: SANS_MEDIUM }]}>{content.eyebrow}</Text>
          <Text style={[ss.title, { color: '#FBF5FB', fontFamily: SERIF }]}>{content.title}</Text>
          <Text style={[ss.intro, { color: '#F7EAF4', fontFamily: SANS }]}>{content.intro}</Text>
        </LinearGradient>
        <View style={ss.content}>
          <Text style={[ss.updated, { color: colors.mutedForeground, fontFamily: SANS }]}>Dernière mise à jour : 8 août 2026</Text>
          <View style={[ss.article, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {content.sections.map((section) => (
              <View key={section.title} style={ss.section}>
                <Text style={[ss.sectionTitle, { color: colors.foreground, fontFamily: SERIF }]}>{section.title}</Text>
                {section.body.map((paragraph) => <Text key={paragraph} style={[ss.paragraph, { color: colors.mutedForeground, fontFamily: SANS }]}>{paragraph}</Text>)}
              </View>
            ))}
          </View>
          <View style={ss.footer}>
            <Text style={[ss.footerText, { color: colors.mutedForeground, fontFamily: SANS }]}>The Nuptial Plan</Text>
            <View style={ss.footerLinks}>
              <TouchableOpacity onPress={() => router.replace('/legal/privacy')}><Text style={[ss.footerLink, { color: colors.plum, fontFamily: SANS_SEMIBOLD }]}>Confidentialité</Text></TouchableOpacity>
              <Text style={[ss.dot, { color: colors.border }]}>·</Text>
              <TouchableOpacity onPress={() => router.replace('/legal/policy')}><Text style={[ss.footerLink, { color: colors.plum, fontFamily: SANS_SEMIBOLD }]}>CGU</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const ss = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingBottom: 28 },
  hero: { paddingHorizontal: 22, paddingTop: 24, paddingBottom: 28, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', paddingVertical: 8, paddingRight: 10, marginBottom: 20 },
  backText: { color: '#FBF5FB', fontSize: 11 },
  heroIcon: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(200,169,110,0.16)', borderWidth: 1, borderColor: 'rgba(200,169,110,0.35)', marginBottom: 16 },
  eyebrow: { fontSize: 9, letterSpacing: 1.8, marginBottom: 8 },
  title: { fontSize: 38, lineHeight: 40 },
  intro: { fontSize: 12, lineHeight: 19, marginTop: 14 },
  content: { paddingHorizontal: 16 },
  updated: { fontSize: 10, textAlign: 'center', marginVertical: 16 },
  article: { borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, padding: 17 },
  section: { marginBottom: 23 },
  sectionTitle: { fontSize: 23, lineHeight: 27, marginBottom: 8 },
  paragraph: { fontSize: 12, lineHeight: 20, marginBottom: 9 },
  footer: { alignItems: 'center', paddingVertical: 22, gap: 9 },
  footerText: { fontSize: 10 },
  footerLinks: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  footerLink: { fontSize: 10 },
  dot: { fontSize: 12 },
});