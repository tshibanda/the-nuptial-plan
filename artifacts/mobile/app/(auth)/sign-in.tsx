import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, ScrollView, Platform, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, Link } from 'expo-router';
import { useSignIn, useSSO } from '@clerk/expo';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SERIF, SANS, SANS_MEDIUM, SANS_SEMIBOLD } from '@/constants/fonts';

// Required: complete any pending OAuth session on mount.
WebBrowser.maybeCompleteAuthSession();

const NAVY_DARK = '#2D102D';   // prune très foncé
const NAVY = '#5D2D5D';        // prune Jardin Parisien
const GOLD = '#C8A96E';        // or chaud
const IVORY = '#FBF5FB';       // blanc rosé
const MUTED = '#C0A0C0';       // prune doux
const BORDER = 'rgba(200,169,110,0.28)';
const INPUT_BG = 'rgba(255,255,255,0.07)';
const INPUT_TEXT = '#FBF5FB';

export function useWarmUpBrowser() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    void WebBrowser.warmUpAsync();
    return () => { void WebBrowser.coolDownAsync(); };
  }, []);
}

export default function SignInScreen() {
  useWarmUpBrowser();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn, errors, fetchStatus } = useSignIn();
  const { startSSOFlow } = useSSO();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState('');
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);

  const isFetching = fetchStatus === 'fetching';

  /* ── OAuth (Google / Apple) ── */
  const handleOAuth = useCallback(async (strategy: 'oauth_google' | 'oauth_apple') => {
    setOauthLoading(strategy === 'oauth_google' ? 'google' : 'apple');
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy,
        redirectUrl: AuthSession.makeRedirectUri(),
      });
      if (createdSessionId && setActive) {
        await setActive({
          session: createdSessionId,
          navigate: async ({ decorateUrl }) => {
            router.replace(decorateUrl('/') as any);
          },
        });
      }
    } catch (err) {
      console.error('OAuth error', err);
    } finally {
      setOauthLoading(null);
    }
  }, [startSSOFlow, router]);

  /* ── Email + Password sign-in ── */
  const handleSignIn = async () => {
    const { error } = await signIn.password({ emailAddress: email, password });
    if (error) return;
    if (signIn.status === 'complete') {
      await signIn.finalize({
        navigate: ({ decorateUrl }) => {
          router.replace(decorateUrl('/') as any);
        },
      });
    }
  };

  /* ── MFA / needs_client_trust step ── */
  const handleVerify = async () => {
    await signIn.mfa.verifyEmailCode({ code });
    if (signIn.status === 'complete') {
      await signIn.finalize({
        navigate: ({ decorateUrl }) => {
          router.replace(decorateUrl('/') as any);
        },
      });
    }
  };

  /* ── Verification code view ── */
  if (signIn.status === 'needs_client_trust') {
    return (
      <LinearGradient colors={[NAVY_DARK, NAVY]} style={[ss.root, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
        <LinearGradient colors={['rgba(255,255,255,0.05)', 'transparent']} style={StyleSheet.absoluteFill} pointerEvents="none" />
        <View style={ss.verifyBox}>
          <Feather name="mail" size={40} color={GOLD} style={{ marginBottom: 16 }} />
          <Text style={[ss.verifyTitle, { fontFamily: SERIF }]}>Vérification requise</Text>
          <Text style={[ss.verifySubtitle, { fontFamily: SANS }]}>Entrez le code reçu par e-mail.</Text>
          <TextInput
            style={[ss.input, { fontFamily: SANS, letterSpacing: 8, textAlign: 'center' }]}
            value={code}
            onChangeText={setCode}
            placeholder="000000"
            placeholderTextColor={MUTED}
            keyboardType="numeric"
          />
          <TouchableOpacity
            style={[ss.primaryBtn, !code && ss.btnDisabled]}
            onPress={handleVerify}
            disabled={!code || isFetching}
          >
            {isFetching
              ? <ActivityIndicator color={NAVY} />
              : <Text style={[ss.primaryBtnText, { fontFamily: SANS_SEMIBOLD }]}>Vérifier</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => signIn.mfa.sendEmailCode()} style={{ marginTop: 12 }}>
            <Text style={[ss.linkText, { fontFamily: SANS }]}>Renvoyer le code</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[NAVY_DARK, NAVY]} style={ss.root}>
      <LinearGradient colors={['rgba(255,255,255,0.05)', 'transparent']} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[ss.scroll, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Logo ── */}
          <View style={ss.logoArea}>
            <View style={ss.monogram}>
              <Text style={[ss.monogramText, { fontFamily: SERIF }]}>N</Text>
            </View>
            <Text style={[ss.wordmark, { fontFamily: SERIF }]}>The Nuptial Plan</Text>
            <Text style={[ss.tagline, { fontFamily: SANS }]}>Pour que rien ne manque à votre bonheur</Text>
          </View>

          <Text style={[ss.heading, { fontFamily: SERIF }]}>Connexion</Text>

          {/* ── Social buttons ── */}
          <View style={ss.socialGroup}>
            <TouchableOpacity
              style={ss.socialBtn}
              onPress={() => handleOAuth('oauth_google')}
              disabled={oauthLoading !== null}
              activeOpacity={0.8}
            >
              {oauthLoading === 'google'
                ? <ActivityIndicator color="#4285F4" size="small" />
                : <Text style={[ss.googleG, { fontFamily: SANS_SEMIBOLD }]}>G</Text>}
              <Text style={[ss.socialBtnText, { fontFamily: SANS_MEDIUM }]}>Continuer avec Google</Text>
            </TouchableOpacity>

            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={ss.applBtn}
                onPress={() => handleOAuth('oauth_apple')}
                disabled={oauthLoading !== null}
                activeOpacity={0.8}
              >
                {oauthLoading === 'apple'
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Feather name="smartphone" size={17} color="#fff" />}
                <Text style={[ss.applBtnText, { fontFamily: SANS_MEDIUM }]}>Continuer avec Apple</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Divider ── */}
          <View style={ss.divider}>
            <View style={ss.dividerLine} />
            <Text style={[ss.dividerText, { fontFamily: SANS }]}>ou par e-mail</Text>
            <View style={ss.dividerLine} />
          </View>

          {/* ── Email ── */}
          <Text style={[ss.label, { fontFamily: SANS_MEDIUM }]}>Adresse e-mail</Text>
          <TextInput
            style={[ss.input, { fontFamily: SANS }]}
            value={email}
            onChangeText={setEmail}
            placeholder="vous@exemple.fr"
            placeholderTextColor={MUTED}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          {errors?.fields?.identifier && (
            <Text style={[ss.errorText, { fontFamily: SANS }]}>{errors.fields.identifier.message}</Text>
          )}

          {/* ── Password ── */}
          <Text style={[ss.label, { fontFamily: SANS_MEDIUM }]}>Mot de passe</Text>
          <View style={ss.passwordRow}>
            <TextInput
              style={[ss.input, { fontFamily: SANS, flex: 1 }]}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={MUTED}
              secureTextEntry={!showPassword}
              autoComplete="password"
            />
            <TouchableOpacity style={ss.eyeBtn} onPress={() => setShowPassword((v) => !v)}>
              <Feather name={showPassword ? 'eye-off' : 'eye'} size={17} color={MUTED} />
            </TouchableOpacity>
          </View>
          {errors?.fields?.password && (
            <Text style={[ss.errorText, { fontFamily: SANS }]}>{errors.fields.password.message}</Text>
          )}

          {/* ── Submit ── */}
          <TouchableOpacity
            style={[ss.primaryBtn, (!email || !password || isFetching) && ss.btnDisabled]}
            onPress={handleSignIn}
            disabled={!email || !password || isFetching}
            activeOpacity={0.85}
          >
            {isFetching
              ? <ActivityIndicator color={NAVY} />
              : <Text style={[ss.primaryBtnText, { fontFamily: SANS_SEMIBOLD }]}>Se connecter</Text>}
          </TouchableOpacity>

          {/* ── Sign-up link ── */}
          <View style={ss.footer}>
            <Text style={[ss.footerText, { fontFamily: SANS }]}>Pas encore de compte ? </Text>
            <Link href="/(auth)/sign-up" asChild>
              <TouchableOpacity>
                <Text style={[ss.footerLink, { fontFamily: SANS_SEMIBOLD }]}>S'inscrire</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const ss = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 24, flexGrow: 1 },
  logoArea: { alignItems: 'center', marginBottom: 32 },
  monogram: {
    width: 64, height: 64, borderWidth: 1.5, borderColor: GOLD,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  monogramText: { fontSize: 36, color: GOLD, lineHeight: 40 },
  wordmark: { fontSize: 26, color: IVORY, marginBottom: 4 },
  tagline: { fontSize: 11, color: MUTED, letterSpacing: 0.4 },
  heading: { fontSize: 30, color: IVORY, textAlign: 'center', marginBottom: 24 },
  socialGroup: { gap: 10, marginBottom: 20 },
  socialBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 6, height: 48,
  },
  googleG: { fontSize: 18, color: '#4285F4' },
  socialBtnText: { fontSize: 14, color: '#1a1a1a' },
  applBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#000', borderRadius: 6, height: 48,
  },
  applBtnText: { fontSize: 14, color: '#fff' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: BORDER },
  dividerText: { fontSize: 12, color: MUTED },
  label: { fontSize: 12, color: MUTED, marginBottom: 6, letterSpacing: 0.3 },
  input: {
    backgroundColor: INPUT_BG, borderWidth: StyleSheet.hairlineWidth, borderColor: BORDER,
    borderRadius: 6, height: 48, paddingHorizontal: 14, color: INPUT_TEXT,
    fontSize: 14, marginBottom: 14,
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  eyeBtn: { position: 'absolute', right: 14, height: 48, justifyContent: 'center' },
  errorText: { fontSize: 11, color: '#e07878', marginTop: -10, marginBottom: 10 },
  primaryBtn: {
    backgroundColor: GOLD, borderRadius: 6, height: 52,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  btnDisabled: { opacity: 0.45 },
  primaryBtnText: { fontSize: 14, color: NAVY },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { fontSize: 13, color: MUTED },
  footerLink: { fontSize: 13, color: GOLD },
  verifyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  verifyTitle: { fontSize: 26, color: IVORY, marginBottom: 8 },
  verifySubtitle: { fontSize: 13, color: MUTED, marginBottom: 24, textAlign: 'center' },
  linkText: { fontSize: 13, color: GOLD },
});
