import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { SANS, SERIF } from '@/constants/fonts';
export default function MoodboardsScreen() {
  const colors = useColors();
  return <View style={[styles.container, { backgroundColor: colors.background }]}><Text style={[styles.eyebrow, { color: colors.goldDim, fontFamily: SANS }]}>INSPIRATION VISUELLE</Text><Text style={[styles.title, { color: colors.foreground, fontFamily: SERIF }]}>Moodboards</Text><Text style={[styles.body, { color: colors.mutedForeground, fontFamily: SANS }]}>Retrouvez vos univers visuels et vos directions artistiques depuis votre mobile.</Text></View>;
}
const styles = StyleSheet.create({ container: { flex: 1, padding: 24, paddingTop: 70 }, eyebrow: { fontSize: 10, letterSpacing: 1.8, marginBottom: 8 }, title: { fontSize: 38, lineHeight: 42 }, body: { marginTop: 14, fontSize: 14, lineHeight: 21 } });