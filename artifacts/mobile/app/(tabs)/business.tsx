import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColors } from '@/hooks/useColors';
import { SANS, SANS_MEDIUM, SANS_SEMIBOLD, SERIF } from '@/constants/fonts';
import { PremiumBadge } from '@/components/PremiumBadge';
import { PremiumPageGate } from '@/components/PremiumPageGate';
import { useSubscription } from '@/lib/subscription';
import { useUser } from '@clerk/expo';
import { useLocalization } from '@/context/LocalizationContext';

type Entry = { id: string; month: string; type: 'income' | 'expense'; label: string; amount: number };
type BusinessData = { hourlyRate: number; annualRevenue: number; fixedCosts: number; microThreshold: number; packagePrice: number; projectHours: number; insurance: boolean; entries: Entry[] };
const STORAGE_KEY = 'tnp-business';
const defaults: BusinessData = { hourlyRate: 45, annualRevenue: 0, fixedCosts: 0, microThreshold: 77700, packagePrice: 3500, projectHours: 80, insurance: false, entries: [] };
const reviewEmail = 'thenuptialplan2@yopmail.com';
const reviewBusinessData: BusinessData = {
  hourlyRate: 68,
  annualRevenue: 48600,
  fixedCosts: 740,
  microThreshold: 77700,
  packagePrice: 4200,
  projectHours: 72,
  insurance: true,
  entries: [
    { id: 'review-1', month: '2026-01', type: 'income', label: 'Maya & Daniel planning retainer', amount: 2100 },
    { id: 'review-2', month: '2026-02', type: 'expense', label: 'Planning studio software', amount: 189 },
    { id: 'review-3', month: '2026-03', type: 'income', label: 'Harper & Lewis coordination', amount: 2800 },
    { id: 'review-4', month: '2026-04', type: 'expense', label: 'Spring portfolio shoot', amount: 620 },
    { id: 'review-5', month: '2026-05', type: 'income', label: 'Olivia & James planning retainer', amount: 1350 },
  ],
};

function loadWebData(): BusinessData {
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }; } catch { return defaults; }
}
function money(value: number, locale: string) { return `${Math.round(value).toLocaleString(locale)} €`; }

export default function BusinessScreen() {
  const { language, locale } = useLocalization();
  const copy = language === 'fr' ? {
    feature: 'votre espace Business', eyebrow: 'VOTRE ACTIVITÉ', title: 'Mon business', body: 'Un espace personnel pour piloter votre trésorerie, votre rentabilité et vos garde-fous professionnels.',
    balance: 'Solde suivi', hourly: 'Taux horaire cible', revenue: 'CA enregistré', margin: 'Marge avant plafond', cash: 'Trésorerie', cashBody: 'Suivez les mois creux avant qu’ils ne vous surprennent.', add: 'Ajouter', month: 'AAAA-MM', label: 'Libellé', income: 'Recette', expense: 'Charge', amount: 'Montant €', empty: 'Ajoutez vos encaissements et charges mensuels.',
    safeguards: 'Garde-fous', safeguardsBody: 'Les chiffres qui protègent vos décisions.', minRate: 'Taux horaire réel minimum', fixedCosts: 'Charges fixes mensuelles', securedRevenue: 'CA annuel déjà sécurisé', threshold: 'Plafond micro à surveiller', insurance: 'RC professionnelle', current: 'À jour', verify: 'À vérifier avant la prochaine saison', markVerified: 'Marquer vérifiée', testPackage: 'Tester un forfait', packageBody: 'Vérifiez votre taux horaire réel avant d’accepter un dossier.', packagePrice: 'Prix du forfait', hours: 'Heures estimées, réunions incluses', actualRate: 'Taux réel du dossier',
  } : {
    feature: 'your Business space', eyebrow: 'YOUR BUSINESS', title: 'My business', body: 'A personal space to manage your cash flow, profitability and professional safeguards.',
    balance: 'Tracked balance', hourly: 'Target hourly rate', revenue: 'Recorded revenue', margin: 'Room before cap', cash: 'Cash flow', cashBody: 'Track quiet months before they catch you by surprise.', add: 'Add', month: 'YYYY-MM', label: 'Label', income: 'Income', expense: 'Expense', amount: 'Amount €', empty: 'Add your monthly income and expenses.',
    safeguards: 'Safeguards', safeguardsBody: 'The numbers that protect your decisions.', minRate: 'Minimum actual hourly rate', fixedCosts: 'Monthly fixed costs', securedRevenue: 'Annual revenue already secured', threshold: 'Micro-business cap to monitor', insurance: 'Professional liability insurance', current: 'Up to date', verify: 'Check before next season', markVerified: 'Mark as checked', testPackage: 'Test a package', packageBody: 'Check your actual hourly rate before accepting a project.', packagePrice: 'Package price', hours: 'Estimated hours, meetings included', actualRate: 'Actual project rate',
  };
  const colors = useColors();
  const { user } = useUser();
  const { isActive: isPremium } = useSubscription();
  const [data, setData] = useState<BusinessData>(() => Platform.OS === 'web' ? loadWebData() : defaults);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (!stored && user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase() === reviewEmail) {
        setData(reviewBusinessData);
        void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(reviewBusinessData));
      } else if (stored) {
        try { setData({ ...defaults, ...JSON.parse(stored) }); } catch { /* Keep defaults if storage is malformed. */ }
      }
    });
  }, [user?.id]);
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

  if (!isPremium) return <PremiumPageGate featureLabel={copy.feature} />;
  return (
    <>
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[colors.plumDark, colors.plum, colors.plumLight]} style={styles.hero}>
           <Text style={[styles.eyebrow, { color: colors.gold }]}>{copy.eyebrow}</Text>
          <View style={styles.heroTitleRow}>
             <Text style={[styles.heroTitle, { color: '#FBF5FB', fontFamily: SERIF }]}>{copy.title}</Text>
            <PremiumBadge />
          </View>
           <Text style={[styles.heroBody, { color: '#F7EAF4', fontFamily: SANS }]}>{copy.body}</Text>
        </LinearGradient>

        <View style={styles.metrics}>
           <Metric icon="credit-card" label={copy.balance} value={money(totals.income - totals.expense, locale)} colors={colors} />
           <Metric icon="clock" label={copy.hourly} value={`${data.hourlyRate} €/h`} colors={colors} />
           <Metric icon="trending-up" label={copy.revenue} value={money(totals.income, locale)} colors={colors} />
           <Metric icon="trending-down" label={copy.margin} value={money(Math.max(0, data.microThreshold - data.annualRevenue), locale)} colors={colors} />
        </View>

         <Section title={copy.cash} subtitle={copy.cashBody} colors={colors} action={<Button label={copy.add} onPress={addEntry} colors={colors} />}>
          <View style={styles.formGrid}>
             <TextInput style={inputStyle} value={entry.month} onChangeText={(month) => setEntry({ ...entry, month })} placeholder={copy.month} placeholderTextColor={colors.mutedForeground} />
             <TextInput style={inputStyle} value={entry.label} onChangeText={(label) => setEntry({ ...entry, label })} placeholder={copy.label} placeholderTextColor={colors.mutedForeground} />
            <TouchableOpacity style={[styles.select, { borderColor: colors.border, backgroundColor: colors.card }]} onPress={() => setEntry({ ...entry, type: entry.type === 'income' ? 'expense' : 'income' })}>
               <Text style={[styles.small, { color: colors.foreground, fontFamily: SANS_MEDIUM }]}>{entry.type === 'income' ? copy.income : copy.expense}</Text>
            </TouchableOpacity>
             <TextInput style={inputStyle} value={entry.amount} onChangeText={(amount) => setEntry({ ...entry, amount })} placeholder={copy.amount} keyboardType="decimal-pad" placeholderTextColor={colors.mutedForeground} />
          </View>
           {data.entries.length === 0 ? <Text style={[styles.empty, { color: colors.mutedForeground, fontFamily: SANS }]}>{copy.empty}</Text> : data.entries.slice().reverse().map((item) => (
            <View key={item.id} style={[styles.entry, { borderBottomColor: colors.border }]}>
              <View style={[styles.dot, { backgroundColor: item.type === 'income' ? colors.sage : colors.rose }]} />
              <Text style={[styles.entryLabel, { color: colors.foreground, fontFamily: SANS }]}>{item.month} · {item.label}</Text>
               <Text style={[styles.entryAmount, { color: item.type === 'income' ? colors.sage : colors.destructive, fontFamily: SANS_SEMIBOLD }]}>{item.type === 'income' ? '+' : '-'}{money(item.amount, locale)}</Text>
              <TouchableOpacity onPress={() => persist({ ...data, entries: data.entries.filter((entryItem) => entryItem.id !== item.id) })}><Feather name="trash-2" size={15} color={colors.mutedForeground} /></TouchableOpacity>
            </View>
          ))}
        </Section>

         <Section title={copy.safeguards} subtitle={copy.safeguardsBody} colors={colors}>
           <NumberSetting label={copy.minRate} value={data.hourlyRate} suffix="€/h" onChange={(v: string) => updateNumber('hourlyRate', v)} colors={colors} />
           <NumberSetting label={copy.fixedCosts} value={data.fixedCosts} suffix="€" onChange={(v: string) => updateNumber('fixedCosts', v)} colors={colors} />
           <NumberSetting label={copy.securedRevenue} value={data.annualRevenue} suffix="€" onChange={(v: string) => updateNumber('annualRevenue', v)} colors={colors} />
           <NumberSetting label={copy.threshold} value={data.microThreshold} suffix="€" onChange={(v: string) => updateNumber('microThreshold', v)} colors={colors} />
          <View style={[styles.insurance, { borderTopColor: colors.border }]}>
             <View style={{ flex: 1 }}><Text style={[styles.settingLabel, { color: colors.foreground, fontFamily: SANS_SEMIBOLD }]}>{copy.insurance}</Text><Text style={[styles.small, { color: colors.mutedForeground, fontFamily: SANS }]}>{data.insurance ? copy.current : copy.verify}</Text></View>
             <Button label={data.insurance ? copy.current : copy.markVerified} onPress={() => persist({ ...data, insurance: !data.insurance })} outline colors={colors} />
          </View>
        </Section>

         <Section title={copy.testPackage} subtitle={copy.packageBody} colors={colors}>
           <NumberSetting label={copy.packagePrice} value={data.packagePrice} suffix="€" onChange={(v: string) => updateNumber('packagePrice', v)} colors={colors} />
           <NumberSetting label={copy.hours} value={data.projectHours} suffix="h" onChange={(v: string) => updateNumber('projectHours', v)} colors={colors} />
           <View style={[styles.result, { backgroundColor: colors.plum + '12' }]}><Text style={[styles.small, { color: colors.mutedForeground, fontFamily: SANS }]}>{copy.actualRate}</Text><Text style={[styles.resultValue, { color: colors.plum, fontFamily: SERIF }]}>{data.projectHours > 0 ? Math.round(data.packagePrice / data.projectHours) : 0} €/h</Text></View>
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