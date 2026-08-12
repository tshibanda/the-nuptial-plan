import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColors } from '@/hooks/useColors';
import { SANS, SANS_MEDIUM, SANS_SEMIBOLD, SERIF } from '@/constants/fonts';
import { PremiumBadge } from '@/components/PremiumBadge';

type Entry = { id: string; month: string; type: 'income' | 'expense'; label: string; amount: number };
type BusinessData = { hourlyRate: number; annualRevenue: number; fixedCosts: number; microThreshold: number; packagePrice: number; projectHours: number; insurance: boolean; entries: Entry[] };
const STORAGE_KEY = 'tnp-business';
const defaults: BusinessData = { hourlyRate: 45, annualRevenue: 0, fixedCosts: 0, microThreshold: 77700, packagePrice: 3500, projectHours: 80, insurance: false, entries: [] };

function loadWebData(): BusinessData {
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }; } catch { return defaults; }
}
function money(value: number) { return `${Math.round(value).toLocaleString('fr-FR')} €`; }

export default function BusinessScreen() {
  const colors = useColors();
  const [data, setData] = useState<BusinessData>(() => Platform.OS === 'web' ? loadWebData() : defaults);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored) {
        try { setData({ ...defaults, ...JSON.parse(stored) }); } catch { /* Keep defaults if storage is malformed. */ }
      }
    });
  }, []);
  const [entry, setEntry] = useState({ month: new Date().toISOString().slice(0, 7), type: 'income' as Entry['type'], label: '', amount: '' });
  const persist = (next: BusinessData) => {
    setData(next);
    if (Platform.OS === 'web') localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };
  const totals = useMemo(() => data.entries.reduce((a, item) => ({ income: a.income + (item.type === 'income' ? item.amount : 0), expense: a.expense + (item.type === 'expense' ? item.amount : 0) }), { income: 0, expense: 0 }), [data.entries]);
  const addEntry = () => {
    const amount = Number(entry.amount);
    if (!entry.label.trim() || !amount) return;
    persist({ ...data, entries: [...data.entries, { id: `${Date.now()}`, month: entry.month, type: entry.type, label: entry.label.trim(), amount }] });
    setEntry({ ...entry, label: '', amount: '' });
  };
  const updateNumber = (key: keyof Pick<BusinessData, 'hourlyRate' | 'annualRevenue' | 'fixedCosts' | 'microThreshold' | 'packagePrice' | 'projectHours'>, value: string) => persist({ ...data, [key]: Number(value) || 0 });
  const inputStyle = [styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }];

  return (
    <>
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[colors.plumDark, colors.plum, colors.plumLight]} style={styles.hero}>
          <Text style={[styles.eyebrow, { color: colors.gold }]}>VOTRE ACTIVITÉ</Text>
          <View style={styles.heroTitleRow}>
            <Text style={[styles.heroTitle, { color: '#FBF5FB', fontFamily: SERIF }]}>Mon business</Text>
            <PremiumBadge />
          </View>
          <Text style={[styles.heroBody, { color: '#F7EAF4', fontFamily: SANS }]}>Un espace personnel pour piloter votre trésorerie, votre rentabilité et vos garde-fous professionnels.</Text>
        </LinearGradient>

        <View style={styles.metrics}>
          <Metric icon="credit-card" label="Solde suivi" value={money(totals.income - totals.expense)} colors={colors} />
          <Metric icon="clock" label="Taux horaire cible" value={`${data.hourlyRate} €/h`} colors={colors} />
          <Metric icon="trending-up" label="CA enregistré" value={money(totals.income)} colors={colors} />
          <Metric icon="trending-down" label="Marge avant plafond" value={money(Math.max(0, data.microThreshold - data.annualRevenue))} colors={colors} />
        </View>

        <Section title="Trésorerie" subtitle="Suivez les mois creux avant qu’ils ne vous surprennent." colors={colors} action={<Button label="Ajouter" onPress={addEntry} colors={colors} />}>
          <View style={styles.formGrid}>
            <TextInput style={inputStyle} value={entry.month} onChangeText={(month) => setEntry({ ...entry, month })} placeholder="AAAA-MM" placeholderTextColor={colors.mutedForeground} />
            <TextInput style={inputStyle} value={entry.label} onChangeText={(label) => setEntry({ ...entry, label })} placeholder="Libellé" placeholderTextColor={colors.mutedForeground} />
            <TouchableOpacity style={[styles.select, { borderColor: colors.border, backgroundColor: colors.card }]} onPress={() => setEntry({ ...entry, type: entry.type === 'income' ? 'expense' : 'income' })}>
              <Text style={[styles.small, { color: colors.foreground, fontFamily: SANS_MEDIUM }]}>{entry.type === 'income' ? 'Recette' : 'Charge'}</Text>
            </TouchableOpacity>
            <TextInput style={inputStyle} value={entry.amount} onChangeText={(amount) => setEntry({ ...entry, amount })} placeholder="Montant €" keyboardType="decimal-pad" placeholderTextColor={colors.mutedForeground} />
          </View>
          {data.entries.length === 0 ? <Text style={[styles.empty, { color: colors.mutedForeground, fontFamily: SANS }]}>Ajoutez vos encaissements et charges mensuels.</Text> : data.entries.slice().reverse().map((item) => (
            <View key={item.id} style={[styles.entry, { borderBottomColor: colors.border }]}>
              <View style={[styles.dot, { backgroundColor: item.type === 'income' ? colors.sage : colors.rose }]} />
              <Text style={[styles.entryLabel, { color: colors.foreground, fontFamily: SANS }]}>{item.month} · {item.label}</Text>
              <Text style={[styles.entryAmount, { color: item.type === 'income' ? colors.sage : colors.destructive, fontFamily: SANS_SEMIBOLD }]}>{item.type === 'income' ? '+' : '-'}{money(item.amount)}</Text>
              <TouchableOpacity onPress={() => persist({ ...data, entries: data.entries.filter((entryItem) => entryItem.id !== item.id) })}><Feather name="trash-2" size={15} color={colors.mutedForeground} /></TouchableOpacity>
            </View>
          ))}
        </Section>

        <Section title="Garde-fous" subtitle="Les chiffres qui protègent vos décisions." colors={colors}>
          <NumberSetting label="Taux horaire réel minimum" value={data.hourlyRate} suffix="€/h" onChange={(v: string) => updateNumber('hourlyRate', v)} colors={colors} />
          <NumberSetting label="Charges fixes mensuelles" value={data.fixedCosts} suffix="€" onChange={(v: string) => updateNumber('fixedCosts', v)} colors={colors} />
          <NumberSetting label="CA annuel déjà sécurisé" value={data.annualRevenue} suffix="€" onChange={(v: string) => updateNumber('annualRevenue', v)} colors={colors} />
          <NumberSetting label="Plafond micro à surveiller" value={data.microThreshold} suffix="€" onChange={(v: string) => updateNumber('microThreshold', v)} colors={colors} />
          <View style={[styles.insurance, { borderTopColor: colors.border }]}>
            <View style={{ flex: 1 }}><Text style={[styles.settingLabel, { color: colors.foreground, fontFamily: SANS_SEMIBOLD }]}>RC professionnelle</Text><Text style={[styles.small, { color: colors.mutedForeground, fontFamily: SANS }]}>{data.insurance ? 'À jour' : 'À vérifier avant la prochaine saison'}</Text></View>
            <Button label={data.insurance ? 'À jour' : 'Marquer vérifiée'} onPress={() => persist({ ...data, insurance: !data.insurance })} outline colors={colors} />
          </View>
        </Section>

        <Section title="Tester un forfait" subtitle="Vérifiez votre taux horaire réel avant d’accepter un dossier." colors={colors}>
          <NumberSetting label="Prix du forfait" value={data.packagePrice} suffix="€" onChange={(v: string) => updateNumber('packagePrice', v)} colors={colors} />
          <NumberSetting label="Heures estimées, réunions incluses" value={data.projectHours} suffix="h" onChange={(v: string) => updateNumber('projectHours', v)} colors={colors} />
          <View style={[styles.result, { backgroundColor: colors.plum + '12' }]}><Text style={[styles.small, { color: colors.mutedForeground, fontFamily: SANS }]}>Taux réel du dossier</Text><Text style={[styles.resultValue, { color: colors.plum, fontFamily: SERIF }]}>{data.projectHours > 0 ? Math.round(data.packagePrice / data.projectHours) : 0} €/h</Text></View>
        </Section>
      </ScrollView>
    </>
  );
}

function Section({ title, subtitle, children, colors, action }: any) { return <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={styles.sectionHeaderRow}><View style={{ flex: 1 }}><Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: SERIF }]}>{title}</Text><Text style={[styles.small, { color: colors.mutedForeground, fontFamily: SANS }]}>{subtitle}</Text></View>{action}</View><View style={{ marginTop: 18 }}>{children}</View></View>; }
function Metric({ icon, label, value, colors }: any) { return <View style={[styles.metric, { backgroundColor: colors.card, borderLeftColor: colors.gold }]}><Feather name={icon} size={17} color={colors.plum} /><Text style={[styles.metricLabel, { color: colors.mutedForeground, fontFamily: SANS }]}>{label}</Text><Text style={[styles.metricValue, { color: colors.foreground, fontFamily: SERIF }]}>{value}</Text></View>; }
function NumberSetting({ label, value, suffix, onChange, colors }: any) { return <View style={styles.setting}><Text style={[styles.settingLabel, { color: colors.foreground, fontFamily: SANS }]}>{label}</Text><View style={styles.numberRow}><TextInput style={[styles.input, { flex: 1, backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]} value={String(value)} onChangeText={onChange} keyboardType="decimal-pad" /><Text style={[styles.small, { color: colors.mutedForeground, fontFamily: SANS }]}>{suffix}</Text></View></View>; }
function Button({ label, onPress, colors, outline = false }: any) { return <TouchableOpacity onPress={onPress} style={[styles.button, { backgroundColor: outline ? colors.card : colors.plum, borderColor: colors.plum }, outline && styles.outlineButton]}><Text style={[styles.buttonText, { color: outline ? colors.plum : '#fff', fontFamily: SANS_SEMIBOLD }]}>{label}</Text></TouchableOpacity>; }

const styles = StyleSheet.create({
  content: { paddingBottom: 160, gap: 16 }, hero: { padding: 24, paddingTop: Platform.OS === 'web' ? 87 : 30, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 }, eyebrow: { fontSize: 10, letterSpacing: 1.8, marginBottom: 8 }, heroTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }, heroTitle: { fontSize: 38, lineHeight: 42 }, heroBody: { marginTop: 14, fontSize: 13, lineHeight: 20, maxWidth: 600 }, metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 16 }, metric: { width: '47%', minHeight: 112, padding: 14, borderLeftWidth: 3, borderRadius: 12 }, metricLabel: { fontSize: 10, marginTop: 12 }, metricValue: { fontSize: 22, marginTop: 4 }, section: { marginHorizontal: 16, padding: 18, borderWidth: 1, borderRadius: 16 }, sectionHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 }, sectionTitle: { fontSize: 25 }, small: { fontSize: 11, lineHeight: 17 }, formGrid: { gap: 9 }, input: { minHeight: 42, borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, fontSize: 12 }, select: { minHeight: 42, borderWidth: 1, borderRadius: 9, justifyContent: 'center', paddingHorizontal: 12 }, button: { minHeight: 42, borderRadius: 9, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1 }, outlineButton: { borderWidth: 1 }, buttonText: { fontSize: 11 }, empty: { textAlign: 'center', paddingVertical: 20, fontSize: 12 }, entry: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 9, borderBottomWidth: 1 }, dot: { width: 8, height: 8, borderRadius: 4 }, entryLabel: { flex: 1, fontSize: 11 }, entryAmount: { fontSize: 11 }, setting: { marginBottom: 14 }, settingLabel: { fontSize: 11, marginBottom: 6 }, numberRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, insurance: { borderTopWidth: 1, paddingTop: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }, result: { borderRadius: 12, padding: 14, marginTop: 4 }, resultValue: { fontSize: 27, marginTop: 3 },
});