import { Platform } from 'react-native';

/**
 * Cross-platform shadow presets.
 * - web  → boxShadow (warm navy-tinted)
 * - iOS  → shadow* props
 * - Android → elevation
 *
 * Spread into a style object: <View style={[styles.card, shadow('md')]} />
 */
export type ShadowLevel = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const WEB: Record<ShadowLevel, string> = {
  xs: '0 1px 2px rgba(30,48,57,0.06), 0 1px 3px rgba(30,48,57,0.04)',
  sm: '0 1px 4px rgba(30,48,57,0.08), 0 2px 6px rgba(30,48,57,0.05)',
  md: '0 3px 10px rgba(30,48,57,0.10), 0 1px 4px rgba(30,48,57,0.06)',
  lg: '0 6px 20px rgba(30,48,57,0.12), 0 2px 6px rgba(30,48,57,0.07)',
  xl: '0 12px 36px rgba(30,48,57,0.14), 0 4px 10px rgba(30,48,57,0.08)',
};

const IOS: Record<ShadowLevel, object> = {
  xs: { shadowColor: '#1e3039', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 2 },
  sm: { shadowColor: '#1e3039', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.09, shadowRadius: 5 },
  md: { shadowColor: '#1e3039', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 10 },
  lg: { shadowColor: '#1e3039', shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.12, shadowRadius: 18 },
  xl: { shadowColor: '#1e3039', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.14, shadowRadius: 28 },
};

const ANDROID: Record<ShadowLevel, object> = {
  xs: { elevation: 1 },
  sm: { elevation: 2 },
  md: { elevation: 4 },
  lg: { elevation: 8 },
  xl: { elevation: 14 },
};

export function shadow(level: ShadowLevel = 'md'): object {
  if (Platform.OS === 'web')     return { boxShadow: WEB[level] } as any;
  if (Platform.OS === 'ios')     return IOS[level];
  if (Platform.OS === 'android') return ANDROID[level];
  return {};
}

/** Gold-tinted accent shadow — use for highlighted/active elements */
export function accentShadow(level: ShadowLevel = 'md'): object {
  if (Platform.OS === 'web') {
    const map: Record<ShadowLevel, string> = {
      xs: '0 1px 3px rgba(200,170,112,0.20)',
      sm: '0 2px 8px rgba(200,170,112,0.22)',
      md: '0 4px 14px rgba(200,170,112,0.26)',
      lg: '0 6px 22px rgba(200,170,112,0.30)',
      xl: '0 10px 36px rgba(200,170,112,0.34)',
    };
    return { boxShadow: map[level] } as any;
  }
  if (Platform.OS === 'ios') {
    const base = IOS[level] as any;
    return { ...base, shadowColor: '#c8aa70' };
  }
  return ANDROID[level];
}
