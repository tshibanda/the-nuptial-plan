import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { WeddingProvider } from '@/context/WeddingContext';
import {
  CormorantGaramond_400Regular,
  CormorantGaramond_600SemiBold,
  CormorantGaramond_700Bold,
} from '@expo-google-fonts/cormorant-garamond';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
} from '@expo-google-fonts/dm-sans';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { ClerkProvider, ClerkLoaded } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setBaseUrl } from '@workspace/api-client-react';
import { OfflineBanner } from '@/components/OfflineBanner';
import { OfflineRefreshScreen } from '@/components/OfflineRefreshScreen';
import { NotificationManager } from '@/components/NotificationManager';

// Set API base URL at module level so all React Query hooks reach the correct host.
if (process.env.EXPO_PUBLIC_DOMAIN) {
  setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`);
}

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;
const proxyUrl = process.env.EXPO_PUBLIC_CLERK_PROXY_URL || undefined;

// Persist the React Query cache to AsyncStorage so data survives app restarts
// and remains available when the planner is offline.
const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  throttleTime: 1_000, // ms — debounce writes
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,          // re-fetch after 30 s when online
      gcTime: 1000 * 60 * 60 * 24, // keep in memory / storage for 24 h
      retry: 1,
    },
  },
});

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: 'Retour' }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false, animation: 'fade' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    CormorantGaramond_400Regular,
    CormorantGaramond_600SemiBold,
    CormorantGaramond_700Bold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache} proxyUrl={proxyUrl}>
      <ClerkLoaded>
        <SafeAreaProvider>
          <StatusBar style="light" backgroundColor="#3C1A3C" translucent={false} />
          <ErrorBoundary>
            <PersistQueryClientProvider
              client={queryClient}
              persistOptions={{ persister: asyncStoragePersister }}
            >
              <WeddingProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <KeyboardProvider>
                    <RootLayoutNav />
                    {/* Floats above all screens — slides in when offline */}
                    <OfflineBanner />
                    <OfflineRefreshScreen />
                    {/* Invisible — manages push-notification permissions and scheduling */}
                    <NotificationManager />
                  </KeyboardProvider>
                </GestureHandlerRootView>
              </WeddingProvider>
            </PersistQueryClientProvider>
          </ErrorBoundary>
        </SafeAreaProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
