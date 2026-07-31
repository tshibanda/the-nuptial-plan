import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { SANS_MEDIUM } from '@/constants/fonts';

type Tone = 'success' | 'warning' | 'error' | 'neutral';

interface Props {
  label: string;
  tone: Tone;
}

export function StatusBadge({ label, tone }: Props) {
  const colors = useColors();

  const toneStyles = {
    success: { bg: colors.successBg, fg: colors.success },
    warning: { bg: colors.warningBg, fg: colors.warning },
    error:   { bg: '#fce8e8', fg: '#c0392b' },
    neutral: { bg: colors.border, fg: colors.mutedForeground },
  } as const;

  const { bg, fg } = toneStyles[tone];

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { fontFamily: SANS_MEDIUM, color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 },
  text: { fontSize: 9, letterSpacing: 0.2 },
});
