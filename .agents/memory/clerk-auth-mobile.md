---
name: Clerk auth — mobile Expo setup
description: How Clerk auth is wired into the Expo mobile app; key decisions and quirks.
---

## Setup summary

- Clerk provisioned via `setupClerkWhitelabelAuth()` — keys auto-set as `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`.
- Mobile dev script prepends `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=$CLERK_PUBLISHABLE_KEY` to expose the key at bundle time.
- `expo-auth-session@~7.0.10` and `expo-secure-store@~15.0.8` must be direct deps of `@workspace/mobile` (not just peer deps of `@clerk/expo`) — Metro cannot resolve transitive Expo packages.

## Route structure

```
app/
  _layout.tsx        ← ClerkProvider + ClerkLoaded wraps everything
  (auth)/
    _layout.tsx      ← redirects signed-in users → /(tabs)
    sign-in.tsx      ← Google + Apple OAuth (useSSO) + email/password (useSignIn)
    sign-up.tsx      ← Google + Apple OAuth (useSSO) + email/password (useSignUp) + OTP
  (tabs)/
    _layout.tsx      ← guards with useAuth().isSignedIn → redirect /(auth)/sign-in
                        + setAuthTokenGetter(() => getToken()) for bearer tokens
```

## Key patterns

- OAuth uses `useSSO()` + `startSSOFlow({ strategy, redirectUrl: AuthSession.makeRedirectUri() })`. Both Google (`oauth_google`) and Apple (`oauth_apple`) use the same hook.
- Apple button shown only on `Platform.OS === 'ios'`.
- `WebBrowser.maybeCompleteAuthSession()` must be called at module level (top of sign-in/sign-up files).
- Android browser warmup: `WebBrowser.warmUpAsync()` / `coolDownAsync()` in a useEffect inside each OAuth screen.
- After successful OAuth → `setActive({ session: createdSessionId, navigate: ({ decorateUrl }) => router.replace(decorateUrl('/') as any) })`.
- After email sign-in/sign-up finalize: same navigate pattern.
- `setAuthTokenGetter(() => getToken())` called in `useEffect` in `(tabs)/_layout.tsx` — wires Clerk bearer token into every generated API client request (mobile has no cookie jar).

## API server

- `@clerk/express` + `http-proxy-middleware` + `@clerk/shared` installed.
- Clerk proxy middleware mounted BEFORE body parsers in `app.ts`.
- `clerkMiddleware` resolves publishable key from request host via `publishableKeyFromHost`.

**Why:** Mobile has no browser cookie jar, so all API auth must use bearer tokens. `setAuthTokenGetter` is the bridge. Never call it from web code (web uses cookies automatically).
