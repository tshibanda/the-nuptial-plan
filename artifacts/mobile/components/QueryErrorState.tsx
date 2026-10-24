import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useLocalization } from '@/context/LocalizationContext';
import { SANS, SANS_SEMIBOLD } from '@/constants/fonts';

type QueryErrorStateProps = {
  onRetry: () => unknown;
  retrying?: boolean;
};

export function QueryErrorState({ onRetry, retrying = false }: QueryErrorStateProps) {
  const colors = useColors();
  const { t } = useLocalization();

  return (
    <View style={styles.container} accessibilityLiveRegion="polite">
      <View style={[styles.iconWrap, { backgroundColor: colors.destructive + '14' }]}>
        <Feather name="alert-circle" size={22} color={colors.destructive} />
      </View>
      <Text style={[styles.message, { color: colors.mutedForeground, fontFamily: SANS }]}>
        {t('common.loadError')}
      </Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t('common.retry')}
        disabled={retrying}
        onPress={() => { void onRetry(); }}
        activeOpacity={0.8}
        style={[styles.button, { backgroundColor: colors.plum, opacity: retrying ? 0.72 : 1 }]}
      >
        {retrying
          ? <ActivityIndicator size="small" color="#fff" />
          : <Feather name="refresh-cw" size={14} color="#fff" />}
        <Text style={[styles.buttonLabel, { fontFamily: SANS_SEMIBOLD }]}>
          {t('common.retry')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 30,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  button: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  buttonLabel: {
    color: '#fff',
    fontSize: 12,
  },
});
