import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useLocalization } from '@/context/LocalizationContext';
import { SANS, SANS_SEMIBOLD } from '@/constants/fonts';

type QueryErrorStateProps = {
  onRetry: () => unknown;
  retrying?: boolean;
  compact?: boolean;
};

export function QueryErrorState({ onRetry, retrying = false, compact = false }: QueryErrorStateProps) {
  const colors = useColors();
  const { t } = useLocalization();

  return (
    <View
      style={compact
        ? [styles.banner, { backgroundColor: colors.muted, borderColor: colors.border }]
        : styles.container}
      accessibilityLiveRegion="polite"
    >
      {!compact && <View style={[styles.iconWrap, { backgroundColor: colors.destructive + '14' }]}>
        <Feather name="alert-circle" size={22} color={colors.destructive} />
      </View>}
      <Text style={[styles.message, compact && styles.bannerMessage, { color: colors.mutedForeground, fontFamily: SANS }]}>
        {t(compact ? 'common.refreshError' : 'common.loadError')}
      </Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={t('common.retry')}
        accessibilityState={{ disabled: retrying, busy: retrying }}
        disabled={retrying}
        onPress={() => { void onRetry(); }}
        activeOpacity={0.8}
        style={[styles.button, { backgroundColor: compact ? colors.card : colors.plum, opacity: retrying ? 0.72 : 1 }]}
      >
        {retrying
          ? <ActivityIndicator size="small" color={compact ? colors.foreground : '#fff'} />
          : <Feather name="refresh-cw" size={14} color={compact ? colors.foreground : '#fff'} />}
        <Text style={[styles.buttonLabel, { fontFamily: SANS_SEMIBOLD, color: compact ? colors.foreground : '#fff' }]}>
          {t('common.retry')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 12,
    borderWidth: 1,
    borderRadius: 10,
  },
  bannerMessage: {
    flex: 1,
    textAlign: 'left',
  },
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
