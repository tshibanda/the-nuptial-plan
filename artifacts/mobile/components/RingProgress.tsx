import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useColors } from '@/hooks/useColors';
import { SERIF, SANS } from '@/constants/fonts';

interface Props {
  value: number;   // 0–100
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  centerText?: string;
}

export function RingProgress({ value, size = 76, strokeWidth = 5, color, label, centerText }: Props) {
  const colors = useColors();
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(Math.max(value, 0), 100) / 100);
  const ringColor = color ?? colors.accent;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={colors.border} strokeWidth={strokeWidth}
        />
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={ringColor} strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Text style={[styles.centerText, { fontFamily: SERIF, color: colors.foreground }]}>
          {centerText ?? `${Math.round(value)}%`}
        </Text>
        {label ? (
          <Text style={[styles.label, { fontFamily: SANS, color: colors.mutedForeground }]}>
            {label.toUpperCase()}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  centerText: { fontSize: 18, lineHeight: 20 },
  label: { fontSize: 7, letterSpacing: 0.8, marginTop: 2 },
});
