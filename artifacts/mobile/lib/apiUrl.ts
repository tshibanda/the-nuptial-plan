import Constants from 'expo-constants';

/**
 * Build a fully-qualified URL for the API server, compatible with both
 * the Replit dev proxy and the deployed production domain.
 *
 * In Expo, relative URLs don't work because the app runs on a different
 * origin than the API. We derive the API base from the app's own origin
 * (expoConfig.hostUri or the dev domain env var) and append the path.
 */
export function getApiUrl(path: string): string {
  // Prefer an explicitly injected base URL (set via EXPO_PUBLIC_API_BASE_URL)
  const explicitBase = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (explicitBase) {
    return `${explicitBase.replace(/\/$/, '')}/api/${path}`;
  }

  // Expo's workflow supplies the Replit preview domain under EXPO_PUBLIC_DOMAIN.
  const configuredDomain = process.env.EXPO_PUBLIC_DOMAIN;
  if (configuredDomain) {
    return `https://${configuredDomain}/api/${path}`;
  }

  // Fall back to a domain provided explicitly to the Expo app config.
  const devDomain = process.env.EXPO_PUBLIC_REPLIT_DEV_DOMAIN ?? Constants.expoConfig?.extra?.replitDevDomain ?? '';
  if (devDomain) {
    return `https://${devDomain}/api/${path}`;
  }

  // Last resort: relative URL (only works in web builds)
  return `/api/${path}`;
}
