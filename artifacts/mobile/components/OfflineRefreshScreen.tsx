import React, { useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useColors } from '@/hooks/useColors';
import { SERIF, SANS, SANS_SEMIBOLD } from '@/constants/fonts';
import { useLocalization } from '@/context/LocalizationContext';

export function OfflineRefreshScreen() {
  const { isOffline } = useNetworkStatus();
  const colors = useColors();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const { t } = useLocalization();

  const refresh = async () => {
    setRefreshing(true);
    await queryClient.refetchQueries({ type: 'active' });
    setRefreshing(false);
  };

  return (
    <Modal visible={isOffline} animationType="fade" transparent={false} statusBarTranslucent>
      <View style={[ss.container, { backgroundColor: colors.background }]}>
        <View style={[ss.icon, { backgroundColor: colors.plum + '12' }]}>
          <Feather name="wifi-off" size={30} color={colors.plum} />
        </View>
        <Text style={[ss.title, { color: colors.foreground, fontFamily: SERIF }]}>{t('offline.title')}</Text>
        <Text style={[ss.body, { color: colors.mutedForeground, fontFamily: SANS }]}>
          {t('offline.body')}
        </Text>
        <TouchableOpacity onPress={refresh} disabled={refreshing} style={[ss.button, { backgroundColor: colors.plum, opacity: refreshing ? 0.65 : 1 }]}>
          {refreshing ? <ActivityIndicator color="#fff" /> : <Feather name="refresh-cw" size={16} color="#fff" />}
          <Text style={[ss.buttonText, { fontFamily: SANS_SEMIBOLD }]}>{t('offline.refresh')}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const ss = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  icon: { width: 76, height: 76, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  title: { fontSize: 32, textAlign: 'center' },
  body: { maxWidth: 340, fontSize: 13, lineHeight: 21, textAlign: 'center', marginTop: 12, marginBottom: 24 },
  button: { minHeight: 46, borderRadius: 10, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 8 },
  buttonText: { color: '#fff', fontSize: 12 },
});