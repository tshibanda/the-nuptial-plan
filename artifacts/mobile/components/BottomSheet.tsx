import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { SERIF, SANS_SEMIBOLD } from '@/constants/fonts';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SHEET_MAX = SCREEN_HEIGHT * 0.82;

interface Props {
  visible: boolean;
  onClose: () => void;
  title?: string;
  eyebrow?: string;
  children: React.ReactNode;
}

export function BottomSheet({ visible, onClose, title, eyebrow, children }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const translate = useRef(new Animated.Value(SHEET_MAX)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translate, {
          toValue: 0,
          useNativeDriver: true,
          damping: 22,
          stiffness: 220,
          mass: 0.8,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translate, {
          toValue: SHEET_MAX,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, translate, opacity]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[ss.backdrop, { opacity }]} />
      </TouchableWithoutFeedback>

      {/* Sheet */}
      <Animated.View
        style={[
          ss.sheet,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            transform: [{ translateY: translate }],
            paddingBottom: Platform.OS === 'ios' ? insets.bottom + 8 : 24,
            maxHeight: SHEET_MAX,
            // Upward shadow to lift the sheet off the backdrop
            ...(Platform.OS === 'web'
              ? { boxShadow: '0 -8px 32px rgba(30,48,57,0.18), 0 -2px 8px rgba(30,48,57,0.10)' } as any
              : Platform.OS === 'ios'
                ? { shadowColor: '#1e3039', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.14, shadowRadius: 20 }
                : { elevation: 16 }),
          },
        ]}
      >
        {/* Drag handle */}
        <View style={[ss.handle, { backgroundColor: colors.border }]} />

        {/* Header */}
        <View style={[ss.header, { borderBottomColor: colors.border }]}>
          <View style={ss.headerText}>
            {eyebrow ? (
              <Text style={[ss.eyebrow, { color: colors.goldDim }]}>{eyebrow}</Text>
            ) : null}
            {title ? (
              <Text style={[ss.title, { fontFamily: SERIF, color: colors.foreground }]} numberOfLines={2}>
                {title}
              </Text>
            ) : null}
          </View>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={[ss.closeBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
          >
            <Feather name="x" size={15} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 16 }}
        >
          {children}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const ss = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(30,48,57,0.55)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: 'hidden',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  headerText: { flex: 1, gap: 2 },
  eyebrow: { fontSize: 8, letterSpacing: 1.6, fontFamily: 'DMSans_600SemiBold' },
  title: { fontSize: 24, lineHeight: 26 },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
});
